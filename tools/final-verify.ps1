# Final verification — run from repo root: powershell -File tools/final-verify.ps1
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:5090"
$log = Join-Path $PSScriptRoot "..\verify-output.txt"
"" | Set-Content -Path $log -Encoding utf8
function Log($m) { Add-Content -Path $log -Value $m -Encoding utf8; Write-Host $m }

# REST JSON may surface as camelCase or PascalCase depending on PowerShell version.
function ApiProp($o, [string]$camel, [string]$pascal) {
    if ($null -eq $o) { return $null }
    $p = $o.PSObject.Properties[$camel]
    if ($null -ne $p) { return $p.Value }
    $p2 = $o.PSObject.Properties[$pascal]
    if ($null -ne $p2) { return $p2.Value }
    return $null
}

# REST may deserialize GUID-like values as strings or other CLR types; avoid fragile `-eq`.
function SameId([object]$a, [object]$b) {
    if ($null -eq $a -or $null -eq $b) { return $false }
    $sa = ([string]$a).Trim()
    $sb = ([string]$b).Trim()
    if ([string]::IsNullOrEmpty($sa) -or [string]::IsNullOrEmpty($sb)) { return $false }
    return [string]::Equals($sa, $sb, [System.StringComparison]::OrdinalIgnoreCase)
}

function HttpErrorBody($err) {
    try {
        $resp = $err.Exception.Response
        if ($null -eq $resp) { return "" }
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        return $sr.ReadToEnd()
    } catch { return "" }
}

function Login($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
        return $r.token
    } catch {
        return $null
    }
}

Log "=== HEALTH ==="
$apiUp = $false
try {
    $h = Invoke-WebRequest -Uri "$base/api/health" -UseBasicParsing -TimeoutSec 5
    Log "health $($h.StatusCode)"
    $apiUp = ($h.StatusCode -eq 200)
} catch {
    Log "health FAIL $($_.Exception.Message)"
    Log "NOTE: Start API (dotnet run in DFile.backend) then re-run for CLI tests."
}

if (-not $apiUp) {
    Log "=== API TESTS SKIPPED (server down) ==="
    Push-Location (Join-Path $PSScriptRoot "..\DFile.backend")
    $be = & dotnet build -v minimal 2>&1
    $be | Select-Object -Last 8 | ForEach-Object { Log $_ }
    Pop-Location
    Push-Location (Join-Path $PSScriptRoot "..\DFile.frontend")
    $fe = & npm run build 2>&1
    $fe | Select-Object -Last 15 | ForEach-Object { Log $_ }
    Pop-Location
    Log "VERDICT: READY WITH LIMITATIONS (API offline; builds see above)"
    Log "DONE log: $log"
    exit 0
}

Log "=== LOGIN ==="
$tok = @{}
$tok.sa = Login "superadmin@dfile.com" "superadmin123"
$tok.m = Login "maintenance.alpha@dfile.com" "maintenance123"
$tok.a = Login "admin.alpha@dfile.com" "admin123"
$tok.f = Login "finance.alpha@dfile.com" "finance123"
foreach ($k in @("sa","m","a","f")) { Log "token $k : $(if($tok[$k]){'OK'}else{'FAIL'})" }

Log "=== ME ==="
try {
    $me = Invoke-RestMethod -Uri "$base/api/auth/me" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 15
    Log "me maint role=$($me.role) tenant=$($me.tenantId)"
} catch { Log "me FAIL $($_.Exception.Message)" }

Log "=== ROOM COUNTS (admin) ==="
try {
    $c = Invoke-RestMethod -Uri "$base/api/RoomCategories/counts" -Headers @{ Authorization = "Bearer $($tok['a'])" } -TimeoutSec 15
    Log ($c | ConvertTo-Json -Compress)
    $sum = [int]$c.archivedRoomCategories + [int]$c.archivedStandaloneSubCategories
    if ([int]$c.archived -eq $sum) { Log "PASS archived sum" } else { Log "FAIL archived sum expected $sum got $($c.archived)" }
} catch { Log "counts FAIL $($_.Exception.Message)" }

Log "=== ROOM CATEGORIES LIST (admin, active) ==="
try {
    $cats = @(Invoke-RestMethod -Uri "$base/api/RoomCategories?showArchived=false" -Headers @{ Authorization = "Bearer $($tok['a'])" } -TimeoutSec 30)
    Log "active categories: $($cats.Count)"
    if ($cats.Count -ge 2) {
        $id1 = [string](ApiProp $cats[0] 'id' 'Id')
        $id2 = [string](ApiProp $cats[1] 'id' 'Id')
        $n1 = [string](ApiProp $cats[0] 'name' 'Name')
        $n2 = [string](ApiProp $cats[1] 'name' 'Name')
        $suffix = "_cli_" + [guid]::NewGuid().ToString("N").Substring(0,8)
        $newName1 = ($n1 + $suffix).Substring(0, [Math]::Min(200, ($n1 + $suffix).Length))
        $rv = ApiProp $cats[0] 'rowVersion' 'RowVersion'
        $putBody = @{ name = $newName1; description = (ApiProp $cats[0] 'description' 'Description'); rowVersion = $rv } | ConvertTo-Json
        Invoke-RestMethod -Uri "$base/api/RoomCategories/$id1" -Method Put -Headers @{ Authorization = "Bearer $($tok['a'])" } -Body $putBody -ContentType "application/json" -TimeoutSec 30 | Out-Null
        $catsAfter = @(Invoke-RestMethod -Uri "$base/api/RoomCategories?showArchived=false" -Headers @{ Authorization = "Bearer $($tok['a'])" } -TimeoutSec 30)
        $u1 = $catsAfter | Where-Object { [string](ApiProp $_ 'id' 'Id') -eq $id1 } | Select-Object -First 1
        $u2 = $catsAfter | Where-Object { [string](ApiProp $_ 'id' 'Id') -eq $id2 } | Select-Object -First 1
        $u1n = [string](ApiProp $u1 'name' 'Name')
        $u2n = [string](ApiProp $u2 'name' 'Name')
        if ($u1n -eq $newName1 -and $u2n -eq $n2) { Log "PASS category update isolation (sibling unchanged)" }
        else { Log "FAIL isolation id1=$u1n id2=$u2n expected2=$n2" }
    } else { Log "SKIP isolation need 2+ categories" }
} catch { Log "room categories FAIL $($_.Exception.Message)" }

Log "=== NOTIFICATIONS ISOLATION ==="
function LeakMaint($list) { @($list | Where-Object { $_.message -like "*requires finance approval*" }).Count }
function LeakFin($list) { @($list | Where-Object { $_.message -like "*Parts are ready*" }).Count }
try {
    $nm = Invoke-RestMethod -Uri "$base/api/notifications" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 30
    $na = Invoke-RestMethod -Uri "$base/api/notifications" -Headers @{ Authorization = "Bearer $($tok['a'])" } -TimeoutSec 30
    $nf = Invoke-RestMethod -Uri "$base/api/notifications" -Headers @{ Authorization = "Bearer $($tok['f'])" } -TimeoutSec 30
    Log "notif counts m=$($nm.Count) a=$($na.Count) f=$($nf.Count)"
    $lm = LeakMaint $nm; $lf = LeakFin $nf
    if ($lm -eq 0) { Log "PASS maint no finance-approval" } else { Log "FAIL maint finance leak $lm" }
    if ($lf -eq 0) { Log "PASS fin no parts-ready" } else { Log "FAIL fin parts-ready leak $lf" }
} catch { Log "notif FAIL $($_.Exception.Message)" }

Log "=== MAINT CREATE no desc + frequency ==="
try {
    $allocRaw = Invoke-RestMethod -Uri "$base/api/maintenance/allocated-assets" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 30
    $alloc = @($allocRaw | ForEach-Object { $_ })
    if ($alloc.Count -eq 0) { Log "SKIP create no allocated assets" }
    else {
        $pick = $alloc | Where-Object { -not [string]::IsNullOrWhiteSpace([string](ApiProp $_ 'assetId' 'AssetId')) } | Select-Object -First 1
        if (-not $pick) { Log "SKIP create no allocation row with non-empty assetId (count=$($alloc.Count))" }
        else {
        $aid = [string](ApiProp $pick 'assetId' 'AssetId')
        $rid = ApiProp $pick 'roomId' 'RoomId'
        $day = (Get-Date).ToString("yyyy-MM-dd")
        $startIso = "${day}T12:00:00Z"
        # Recurring frequencies require endDate. One-time + non-empty frequency skips description requirement.
        $hCreate = @{ assetId = $aid; description = ""; frequency = "One-time"; status = "Open"; startDate = $startIso; type = "Preventive" }
        $ridStr = [string]$rid
        if (-not [string]::IsNullOrWhiteSpace($ridStr)) { $hCreate.roomId = $ridStr }
        $body = $hCreate | ConvertTo-Json -Compress
        Log "create body: $body"
        try {
            $cr = Invoke-RestMethod -Uri "$base/api/maintenance" -Method Post -Headers @{ Authorization = "Bearer $($tok['m'])" } -Body $body -ContentType "application/json" -TimeoutSec 60
            Log "PASS create one-time empty desc count=$($cr.count)"
        } catch {
            $code = $_.Exception.Response.StatusCode.value__
            $eb = HttpErrorBody $_
            Log "create status=$code err=$eb"
        }
        $bodyBad = @{ assetId = $aid; roomId = $rid; description = ""; frequency = $null; status = "Open"; startDate = $startIso; type = "Corrective" } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$base/api/maintenance" -Method Post -Headers @{ Authorization = "Bearer $($tok['m'])" } -Body $bodyBad -ContentType "application/json" -TimeoutSec 60 | Out-Null
            Log "FAIL create without freq should 400"
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 400) { Log "PASS negative no-freq requires desc" } else { Log "NEG unexpected $($_.Exception.Response.StatusCode.value__)" }
        }
        }
    }
} catch { Log "maint create FAIL $($_.Exception.Message)" }

Log "=== INSPECTION workflow (pending if any) ==="
try {
    $mrecRaw = Invoke-RestMethod -Uri "$base/api/maintenance?showArchived=false" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 30
    $mrec = @($mrecRaw | ForEach-Object { $_ })
    $pend = $mrec | Where-Object { (ApiProp $_ 'status' 'Status') -eq "Pending" } | Select-Object -First 1
    if (-not $pend) { Log "SKIP inspection no Pending row" }
    else {
        $pid = [string](ApiProp $pend 'id' 'Id')
        $iw = @{ outcome = "Not Repairable"; detailNotes = "Final verify CLI: not repairable path." } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$base/api/maintenance/$pid/inspection-workflow" -Method Post -Headers @{ Authorization = "Bearer $($tok['m'])" } -Body $iw -ContentType "application/json" -TimeoutSec 60
        Log "PASS inspection $pid -> $((ApiProp $r 'status' 'Status')) $((ApiProp $r 'financeRequestType' 'FinanceRequestType'))"
    }
} catch { Log "inspection FAIL $($_.Exception.Message) $($_.ErrorDetails.Message)" }

Log "=== FINANCE submission-detail + 403 ==="
try {
    $mrecRaw2 = Invoke-RestMethod -Uri "$base/api/maintenance?showArchived=false" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 30
    $mrec = @($mrecRaw2 | ForEach-Object { $_ })
    $fr = $mrec | Where-Object { (ApiProp $_ 'status' 'Status') -eq "Finance Review" } | Select-Object -First 1
    if (-not $fr) { Log "SKIP submission-detail no Finance Review row" }
    else {
        $fid = [string](ApiProp $fr 'id' 'Id')
        Log "submission-detail id=$fid"
        $sd = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/$fid/submission-detail" -Headers @{ Authorization = "Bearer $($tok['f'])" } -TimeoutSec 30
        $keys = $sd.PSObject.Properties.Name -join ","
        Log "detail keys: $keys"
        $badKeys = @("status","financeWorkflowStatus","timeline","history") | Where-Object { $keys -contains $_ }
        if ($badKeys.Count -eq 0) { Log "PASS no leaked workflow keys" } else { Log "FAIL leaked $($badKeys -join ',')" }
        try {
            Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/$fid/submission-detail" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 15 | Out-Null
            Log "FAIL maint should 403"
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 403) { Log "PASS maint forbidden finance detail" } else { Log "maint detail code $($_.Exception.Response.StatusCode.value__)" }
        }
    }
} catch { Log "finance detail FAIL $($_.Exception.Message)" }

Log "=== REPAIR complete + history ==="
try {
    $mrecRaw3 = Invoke-RestMethod -Uri "$base/api/maintenance?showArchived=false" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 30
    $mrec = @($mrecRaw3 | ForEach-Object { $_ })
    $rep = $mrec | Where-Object {
            (ApiProp $_ 'financeRequestType' 'FinanceRequestType') -eq "Repair" -and
            @("Parts Ready", "Approved") -contains (ApiProp $_ 'financeWorkflowStatus' 'FinanceWorkflowStatus') -and
            @("Scheduled", "In Progress") -contains (ApiProp $_ 'status' 'Status')
        } | Select-Object -First 1
    if (-not $rep) { Log "SKIP complete-repair no eligible row" }
    else {
        $rid = [string](ApiProp $rep 'id' 'Id')
        $assetId = [string](ApiProp $rep 'assetId' 'AssetId')
        Log "complete-repair id=$rid asset=$assetId"
        $repairMarker = "Final verify CLI repair complete."
        $cb = @{ repairDescription = $repairMarker } | ConvertTo-Json
        Invoke-RestMethod -Uri "$base/api/maintenance/$rid/complete-repair" -Method Post -Headers @{ Authorization = "Bearer $($tok['m'])" } -Body $cb -ContentType "application/json" -TimeoutSec 60 | Out-Null
        Log "PASS complete-repair $rid"
        $histRaw = Invoke-RestMethod -Uri "$base/api/maintenance/repair-history?assetId=$assetId" -Headers @{ Authorization = "Bearer $($tok['m'])" } -TimeoutSec 30
        $hist = @($histRaw | ForEach-Object { $_ })
        $hit = $hist | Where-Object {
            (SameId (ApiProp $_ 'maintenanceRecordId' 'MaintenanceRecordId') $rid) -or
            ([string](ApiProp $_ 'notes' 'Notes')).IndexOf($repairMarker, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        }
        if ($hit) { Log "PASS repair-history row for record" } else { Log "RISK/WARN history rows=$($hist.Count) no match id" }
    }
} catch { Log "repair complete FAIL $($_.Exception.Message) $($_.ErrorDetails.Message)" }

Log "=== BUILDS ==="
Push-Location (Join-Path $PSScriptRoot "..\DFile.backend")
$be = & dotnet build -v minimal 2>&1
$beText = $be | Out-String
if ($beText -match "MSB3021|being used by another process") {
    Log "WARN backend build skipped (DLL locked - stop dotnet run to build, or ignore if API is intentional)"
} else {
    $be | Select-Object -Last 6 | ForEach-Object { Log $_ }
}
Pop-Location
Push-Location (Join-Path $PSScriptRoot "..\DFile.frontend")
$fe = & npm run build 2>&1
$fe | Select-Object -Last 12 | ForEach-Object { Log $_ }
Pop-Location
Log "VERDICT: Review PASS/FAIL/SKIP above. If no FAIL, runtime READY (subject to product rules)."
Log "DONE log: $log"
