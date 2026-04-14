# Paranoid CLI E2E validation - http://localhost:5090
$ErrorActionPreference = "Continue"
$base = "http://localhost:5090"
$results = [ordered]@{}

function Login([string]$e, [string]$p) {
    $b = @{ email = $e; password = $p } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $b -ContentType "application/json" -ErrorAction Stop
    return $r.token
}
function AuthHdr([string]$t) { return @{ Authorization = "Bearer $t" } }

# Invoke-RestMethod returns a single PSCustomObject when JSON has one element; breaks .Count checks.
function AsArray($x) {
    if ($null -eq $x) { return @() }
    if ($x -is [System.Array]) { return $x }
    return @($x)
}

function Try-Req {
    param([scriptblock]$Fn)
    try { return @{ ok = $true; res = & $Fn } } catch { return @{ ok = $false; err = $_.Exception.Message; status = $_.Exception.Response.StatusCode.value__ } }
}

Write-Host "=== Health: login all roles ===" -ForegroundColor Cyan
try {
    $tokM = Login "maintenance.alpha@dfile.com" "maintenance123"
    $tokF = Login "finance.alpha@dfile.com" "finance123"
    $tokA = Login "admin.alpha@dfile.com" "admin123"
    $tokS = Login "superadmin@dfile.com" "superadmin123"
    $results["logins"] = "PASS"
} catch {
    Write-Host "FATAL: $_" -ForegroundColor Red
    $results["logins"] = "FAIL: $_"
    $results | ConvertTo-Json -Depth 3
    exit 1
}

$hm = AuthHdr $tokM
$hf = AuthHdr $tokF
$ha = AuthHdr $tokA
$hs = AuthHdr $tokS

function Get-Notifications([hashtable]$hdr) {
    AsArray (Invoke-RestMethod -Uri "$base/api/notifications?unreadOnly=false" -Headers $hdr)
}
function Unread([hashtable]$hdr) {
    (Invoke-RestMethod -Uri "$base/api/notifications/unread-count" -Headers $hdr).count
}

# --- Pick allocated assets (maintenance); bootstrap a 2nd allocation if DB only has one ---
$allocs = AsArray (Invoke-RestMethod -Uri "$base/api/maintenance/allocated-assets" -Headers $hm)
$bootstrapTries = 0
while ($allocs.Count -lt 2 -and $bootstrapTries -lt 5) {
    $bootstrapTries++
    $avail = AsArray (Invoke-RestMethod -Uri "$base/api/assets/available-for-allocation" -Headers $ha)
    $rooms = AsArray (Invoke-RestMethod -Uri "$base/api/rooms" -Headers $ha)
    if ($avail.Count -lt 1 -or $rooms.Count -lt 1) { break }
    $existingIds = @($allocs | ForEach-Object { $_.assetId })
    $roomId = [string]$rooms[0].id
    if ($allocs.Count -ge 1 -and $allocs[0].roomId) { $roomId = [string]$allocs[0].roomId }
    $allocatedOne = $false
    foreach ($pick in $avail) {
        if ($existingIds -contains $pick.id) { continue }
        $allocBody = @{ assetId = [string]$pick.id; roomId = $roomId } | ConvertTo-Json
        try {
            $null = Invoke-RestMethod -Uri "$base/api/allocations" -Method Post -Headers $ha -Body $allocBody -ContentType "application/json" -ErrorAction Stop
            $allocatedOne = $true
            break
        } catch {
            continue
        }
    }
    if (-not $allocatedOne) { $results["preflight_bootstrap_error"] = "no candidate asset allocated"; break }
    Start-Sleep -Milliseconds 400
    $allocs = AsArray (Invoke-RestMethod -Uri "$base/api/maintenance/allocated-assets" -Headers $hm)
}
if ($allocs.Count -lt 2) {
    $results["preflight_allocations"] = "FAIL: need >=2 allocated assets after bootstrap, got $($allocs.Count)"
    $results | ConvertTo-Json -Depth 3
    Write-Host $results["preflight_allocations"] -ForegroundColor Red
    exit 1
}
$results["preflight_allocations"] = "PASS: count=$($allocs.Count)"
$asset1 = $allocs[0].assetId
$room1 = $allocs[0].roomId
$asset2 = $allocs[1].assetId
$room2 = $allocs[1].roomId
if ($allocs.Count -ge 3) {
    $asset3 = $allocs[2].assetId
    $room3 = $allocs[2].roomId
} else {
    $asset3 = $asset2
    $room3 = $room2
}
$start = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

try {

    # --- Full replacement lifecycle ---
    $createBody = @{
        assetId        = $asset1
        roomId         = $room1
        description    = "PARANOID E2E replacement $(Get-Random)"
        status         = "Open"
        priority       = "High"
        type           = "Corrective"
        frequency      = "One-time"
        startDate      = $start
    } | ConvertTo-Json

    $created = Invoke-RestMethod -Uri "$base/api/maintenance" -Method Post -Headers $hm -Body $createBody -ContentType "application/json"
    $recId = $created.items[0].id
    $reqLabel = $created.items[0].requestId
    Write-Host "Created maintenance $recId ($reqLabel) for asset $asset1"

    $finForEntityBefore = (Get-Notifications $hf | Where-Object { [string]$_.entityId -eq [string]$recId } | Measure-Object).Count
    $financeUnreadBefore = Unread $hf
    $inspBody = @{ outcome = "Not Repairable"; detailNotes = "Paranoid E2E: not economically repairable." } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$base/api/maintenance/$recId/inspection-workflow" -Method Post -Headers $hm -Body $inspBody -ContentType "application/json"

    Start-Sleep -Milliseconds 900
    $financeUnreadAfter = Unread $hf
    $finForEntityAfter = (Get-Notifications $hf | Where-Object { [string]$_.entityId -eq [string]$recId } | Measure-Object).Count
    $finMsg = Get-Notifications $hf | Where-Object { [string]$_.entityId -eq [string]$recId } | Select-Object -First 1

    $queue = AsArray (Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests" -Headers $hf)
    $inQueue = @($queue | Where-Object { [string]$_.id -eq [string]$recId }).Count -eq 1

    if ($finForEntityAfter -le $finForEntityBefore -or -not $finMsg -or -not $finMsg.message.ToLower().Contains("finance")) {
        $results["maint_to_finance_notif"] = "FAIL: entity notifications before=$finForEntityBefore after=$finForEntityAfter"
    } elseif ($finForEntityAfter -gt $finForEntityBefore + 1) {
        $results["maint_to_finance_notif"] = "FAIL: duplicate burst before=$finForEntityBefore after=$finForEntityAfter"
    } else {
        $results["maint_to_finance_notif"] = "PASS"
    }
    $results["finance_unread_count_increments"] = if ($financeUnreadAfter -gt $financeUnreadBefore) { "PASS" } else { "FAIL $($financeUnreadBefore)->$($financeUnreadAfter)" }

    if (-not $inQueue) {
        $results["finance_queue_after_inspection"] = "FAIL"
    } else {
        $results["finance_queue_after_inspection"] = "PASS"
    }

    $null = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/$recId/approve-replacement" -Method Patch -Headers $hf

    $cats = Invoke-RestMethod -Uri "$base/api/AssetCategories" -Headers $hf
    $catId = $cats[0].id
    $serial = "PND-$(Get-Random)-$(Get-Random)"
    $postAsset = @{
        assetName                      = "Paranoid Replacement Asset"
        categoryId                     = $catId
        acquisitionCost                = 500
        purchasePrice                  = 500
        usefulLifeYears                = 5
        currentCondition               = 0
        lifecycleStatus                = 0
        replacementMaintenanceRecordId = $recId
        serialNumber                   = $serial
    } | ConvertTo-Json

    $newAsset = Invoke-RestMethod -Uri "$base/api/assets" -Method Post -Headers $hf -Body $postAsset -ContentType "application/json"
    $newId = $newAsset.id
    Write-Host "Replacement asset id=$newId"

    $maintAfter = Invoke-RestMethod -Uri "$base/api/maintenance/$recId" -Headers $hm
    if ($maintAfter.replacementRegisteredAssetId -ne $newId) {
        $results["replacement_link_on_record"] = "FAIL: expected $newId got $($maintAfter.replacementRegisteredAssetId)"
    } else {
        $results["replacement_link_on_record"] = "PASS"
    }

    $origDisposed = Invoke-RestMethod -Uri "$base/api/assets/$asset1" -Headers $hf
    if ($origDisposed.lifecycleStatus -ne 6) {
        $results["original_disposed"] = "FAIL: lifecycleStatus=$($origDisposed.lifecycleStatus)"
    } else {
        $results["original_disposed"] = "PASS"
    }

    $activeList = AsArray (Invoke-RestMethod -Uri "$base/api/assets" -Headers $hf)
    $stillThere = @($activeList | Where-Object { $_.id -eq $asset1 }).Count
    if ($stillThere -gt 0) {
        $results["original_not_in_active_list"] = "FAIL"
    } else {
        $results["original_not_in_active_list"] = "PASS"
    }

    $withDisp = AsArray (Invoke-RestMethod -Uri "$base/api/assets?includeDisposed=true" -Headers $hf)
    $inDisposed = @($withDisp | Where-Object { $_.id -eq $asset1 }).Count -eq 1
    $results["original_in_includeDisposed"] = $(if ($inDisposed) { "PASS" } else { "FAIL" })

    $activeAllocs = AsArray (Invoke-RestMethod -Uri "$base/api/allocations/active" -Headers $hf)
    $origAlloc = @($activeAllocs | Where-Object { $_.assetId -eq $asset1 }).Count
    if ($origAlloc -gt 0) {
        $results["original_not_in_active_allocations"] = "FAIL: still $origAlloc active row(s)"
    } else {
        $results["original_not_in_active_allocations"] = "PASS"
    }

    $avail = AsArray (Invoke-RestMethod -Uri "$base/api/assets/available-for-allocation" -Headers $hf)
    $newAvail = @($avail | Where-Object { $_.id -eq $newId }).Count -eq 1
    $results["replacement_in_available_for_allocation"] = $(if ($newAvail) { "PASS" } else { "FAIL" })

    Start-Sleep -Milliseconds 500
    $adminReplCnt = (Get-Notifications $ha | Where-Object { [string]$_.entityId -eq [string]$newId -and $_.message -like "*replacement*" } | Measure-Object).Count
    if ($adminReplCnt -lt 1) {
        $results["finance_to_admin_replacement_notif"] = "FAIL"
    } else {
        $results["finance_to_admin_replacement_notif"] = "PASS"
    }

    # Double approve replacement (should fail)
    $dblApr = Try-Req { Invoke-WebRequest -Uri "$base/api/finance/maintenance-requests/$recId/approve-replacement" -Method Patch -Headers $hf -UseBasicParsing }
    $results["double_approve_replacement"] = if (-not $dblApr.ok -and $dblApr.status -in @(400,404,409)) { "PASS ($($dblApr.status))" } else { "FAIL $($dblApr | ConvertTo-Json -Compress)" }

    # Double replacement POST
    $dblPost = Try-Req { Invoke-WebRequest -Uri "$base/api/assets" -Method Post -Headers $hf -Body $postAsset -ContentType "application/json" -UseBasicParsing }
    $results["double_replacement_post"] = if (-not $dblPost.ok -and $dblPost.status -in @(400,409)) { "PASS ($($dblPost.status))" } else { "FAIL" }

    # Finance registers brand-new asset (non-replacement) -> Admin notification
    $nat = "NAT-$(Get-Random)-$(Get-Random)"
    $plainAssetBody = @{
        assetName       = "Paranoid Plain New Asset"
        categoryId      = $catId
        acquisitionCost = 75
        purchasePrice   = 75
        usefulLifeYears = 5
        serialNumber    = $nat
    } | ConvertTo-Json
    $plainAsset = Invoke-RestMethod -Uri "$base/api/assets" -Method Post -Headers $hf -Body $plainAssetBody -ContentType "application/json"
    Start-Sleep -Milliseconds 900
    $admPlainCnt = (Get-Notifications $ha | Where-Object { [string]$_.entityId -eq [string]$plainAsset.id -and $_.message -like "*new asset*" } | Measure-Object).Count
    $results["finance_new_asset_admin_notif"] = if ($admPlainCnt -ge 1) { "PASS" } else { "FAIL" }

    # Cannot allocate disposed original
    $allocDisposed = Try-Req {
        $b = @{ assetId = [string]$asset1; roomId = [string]$room1 } | ConvertTo-Json
        Invoke-WebRequest -Uri "$base/api/allocations" -Method Post -Headers $ha -Body $b -ContentType "application/json" -UseBasicParsing
    }
    $results["allocate_disposed_asset_rejected"] = if (-not $allocDisposed.ok -and $allocDisposed.status -eq 400) { "PASS" } else { "FAIL status=$($allocDisposed.status)" }

    $lifecyclePass = ($results["replacement_link_on_record"] -eq "PASS" -and $results["original_disposed"] -eq "PASS" -and $results["original_not_in_active_list"] -eq "PASS" -and $results["original_in_includeDisposed"] -eq "PASS" -and $results["original_not_in_active_allocations"] -eq "PASS")
    $results["replacement_lifecycle_aggregate"] = if ($lifecyclePass) { "PASS" } else { "FAIL" }
} catch {
    $results["replacement_lifecycle_aggregate"] = "FAIL: exception $_"
    Write-Host $_ -ForegroundColor Red
}

# --- Admin -> Maintenance notification ---
$start2 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$mBefore = Unread $hm
$adminCreate = @{
    assetId     = $asset2
    roomId      = $room2
    description = "PARANOID admin-created ticket $(Get-Random)"
    status      = "Open"
    priority    = "Medium"
    type        = "Preventive"
    frequency   = "One-time"
    startDate   = $start2
} | ConvertTo-Json
$adminCreated = Invoke-RestMethod -Uri "$base/api/maintenance" -Method Post -Headers $ha -Body $adminCreate -ContentType "application/json"
$adminRecId = $adminCreated.items[0].id
Start-Sleep -Milliseconds 400
$mNotifsCnt = (Get-Notifications $hm | Where-Object { [string]$_.entityId -eq [string]$adminRecId } | Measure-Object).Count
$mFirst = Get-Notifications $hm | Where-Object { [string]$_.entityId -eq [string]$adminRecId } | Select-Object -First 1
if ($mNotifsCnt -ge 1 -and $mFirst.message -like "*from Admin*") {
    $results["admin_to_maintenance_notif"] = "PASS"
} else {
    $results["admin_to_maintenance_notif"] = "FAIL: count=$mNotifsCnt msg=$($mFirst.message)"
}

# --- Repair + parts ready (Finance -> Maintenance) ---
$start3 = (Get-Date).ToUniversalTime().AddMinutes(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$repairCreate = @{
    assetId     = $asset3
    roomId      = $room3
    description = "PARANOID repair parts $(Get-Random)"
    status      = "Open"
    priority    = "High"
    type        = "Corrective"
    frequency   = "One-time"
    startDate   = $start3
} | ConvertTo-Json
$repCreated = Invoke-RestMethod -Uri "$base/api/maintenance" -Method Post -Headers $hm -Body $repairCreate -ContentType "application/json"
$repId = $repCreated.items[0].id
$inspRepair = @{
    outcome             = "Repairable"
    detailNotes         = "Paranoid repair path."
    estimatedRepairCost = 99.5
} | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$base/api/maintenance/$repId/inspection-workflow" -Method Post -Headers $hm -Body $inspRepair -ContentType "application/json"
$null = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/$repId/approve-repair" -Method Patch -Headers $hf

$mCountBeforeParts = (Get-Notifications $hm | Where-Object { [string]$_.entityId -eq [string]$repId -and $_.message -like "*Parts are ready*" } | Measure-Object).Count
$null = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/$repId/mark-parts-ready" -Method Patch -Headers $hf
Start-Sleep -Milliseconds 400
$mCountAfterParts = (Get-Notifications $hm | Where-Object { [string]$_.entityId -eq [string]$repId -and $_.message -like "*Parts are ready*" } | Measure-Object).Count
if ($mCountAfterParts -eq $mCountBeforeParts + 1) {
    $results["finance_to_maintenance_parts_ready"] = "PASS"
} elseif ($mCountAfterParts -gt $mCountBeforeParts + 1) {
    $results["finance_to_maintenance_parts_ready"] = "FAIL: duplicate notifications"
} else {
    $results["finance_to_maintenance_parts_ready"] = "FAIL: before=$mCountBeforeParts after=$mCountAfterParts"
}

$dblParts = Try-Req { Invoke-WebRequest -Uri "$base/api/finance/maintenance-requests/$repId/mark-parts-ready" -Method Patch -Headers $hf -UseBasicParsing }
$results["double_mark_parts_ready"] = if (-not $dblParts.ok -and $dblParts.status -in @(400,404)) { "PASS ($($dblParts.status))" } else { "FAIL" }

# --- Schedule summary vs full (5 records) ---
$maintList = AsArray (Invoke-RestMethod -Uri "$base/api/maintenance" -Headers $hm)
$ids = @($maintList | Select-Object -First 8 -ExpandProperty id)
$leak = @()
foreach ($mid in $ids) {
    if ($mid -notmatch '^[0-9a-fA-F-]{36}$') { continue }
    $sum = Invoke-RestMethod -Uri "$base/api/maintenance/$mid/schedule-summary" -Headers $hm
    $full = Invoke-RestMethod -Uri "$base/api/maintenance/$mid" -Headers $hm
    foreach ($prop in @("quotationNotes", "cost", "attachments", "inspectionNotes", "diagnosisOutcome", "financeRequestType", "financeWorkflowStatus", "description")) {
        if ($null -ne $sum.PSObject.Properties[$prop]) { $leak += "${mid}:$prop" }
    }
    if ($null -eq $full.PSObject.Properties["quotationNotes"]) { } # ok if null
}
if ($leak.Count -eq 0) {
    $results["schedule_summary_leak"] = 'PASS: checked ' + $ids.Count + ' ids'
} else {
    $results["schedule_summary_leak"] = "FAIL: quotationNotes on summary for $($leak -join ',')"
}

# --- Role boundaries ---
$badFinance = Try-Req { Invoke-WebRequest -Uri "$base/api/maintenance/$repId/inspection-workflow" -Method Post -Headers $hf -Body (@{ outcome = "No Fix Needed"; detailNotes = "x" } | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing }
$results["finance_cannot_inspection"] = if (-not $badFinance.ok -and $badFinance.status -eq 403) { "PASS" } else { "RISK/FAIL status=$($badFinance.status)" }

$badMaint = Try-Req { Invoke-WebRequest -Uri "$base/api/finance/maintenance-requests/$repId/approve-repair" -Method Patch -Headers $hm -UseBasicParsing }
$results["maint_cannot_finance_approve"] = if (-not $badMaint.ok -and $badMaint.status -eq 403) { "PASS" } else { "FAIL status=$($badMaint.status)" }

$badTok = Try-Req { Invoke-WebRequest -Uri "$base/api/auth/me" -Headers @{ Authorization = "Bearer bogus.invalid.token" } -UseBasicParsing }
$results["invalid_token_401"] = if (-not $badTok.ok -and $badTok.status -eq 401) { "PASS" } else { "FAIL status=$($badTok.status)" }

# --- Duplicate schedule batch (409) ---
$series = [guid]::NewGuid().ToString("N")
$dupBatch = @{
    assetId          = $asset2
    roomId           = $room2
    description      = "dup series test"
    status           = "Open"
    priority         = "Low"
    type             = "Corrective"
    frequency        = "One-time"
    startDate        = $start2
    scheduleSeriesId = $series
} | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$base/api/maintenance" -Method Post -Headers $ha -Body $dupBatch -ContentType "application/json"
$dup2 = Try-Req { Invoke-WebRequest -Uri "$base/api/maintenance" -Method Post -Headers $ha -Body $dupBatch -ContentType "application/json" -UseBasicParsing }
$results["duplicate_schedule_series_conflict"] = if (-not $dup2.ok -and $dup2.status -eq 409) { "PASS" } else { "FAIL $($dup2 | ConvertTo-Json -Compress)" }

$results | ConvertTo-Json -Depth 2
Write-Host "`n=== SUMMARY ===" -ForegroundColor Yellow
$results.GetEnumerator() | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }
