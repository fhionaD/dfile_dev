# CLI verification: room unit + room category archive rules (requires running API).
$ErrorActionPreference = "Stop"
$base = if ($env:DFILE_API_BASE) { $env:DFILE_API_BASE } else { "http://localhost:5090" }
$results = [System.Collections.ArrayList]::new()

function Add-Result($name, $ok, $detail) {
    [void]$results.Add([pscustomobject]@{ Test = $name; Pass = $ok; Detail = $detail })
}

function Get-Token($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body $body
    if (-not $r.token) { throw "No token for $email" }
    return $r.token
}

function Auth($t) { return @{ Authorization = "Bearer $t" } }

function Invoke-Api {
    param([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, [string]$Body = $null, [int[]]$ExpectStatus = @(200))
    try {
        $params = @{ Uri = $Uri; Method = $Method; Headers = $Headers; UseBasicParsing = $true }
        if ($Body) { $params.ContentType = "application/json"; $params.Body = $Body }
        $resp = Invoke-WebRequest @params
        $code = [int]$resp.StatusCode
        if ($ExpectStatus -notcontains $code) { return @{ Ok = $false; Code = $code; Body = $resp.Content } }
        return @{ Ok = $true; Code = $code; Content = $resp.Content }
    }
    catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $txt = $reader.ReadToEnd()
            if ($ExpectStatus -contains $code) { return @{ Ok = $true; Code = $code; Body = $txt } }
            return @{ Ok = $false; Code = $code; Body = $txt }
        }
        return @{ Ok = $false; Code = -1; Body = $_.Exception.Message }
    }
}

$admin = Get-Token "admin.alpha@dfile.com" "admin123"
$maint = Get-Token "maintenance.alpha@dfile.com" "maintenance123"
$hAdmin = Auth $admin
$hMaint = Auth $maint

# --- Room units: list includes activeAllocationCount ---
try {
    $rooms = Invoke-RestMethod -Uri "$base/api/rooms?showArchived=false" -Headers $hAdmin
    $hasCountProp = ($rooms.Count -gt 0) -and ($null -ne $rooms[0].PSObject.Properties["activeAllocationCount"])
    Add-Result "rooms_list_has_activeAllocationCount" $hasCountProp "count=$($rooms.Count)"
    $allocated = @($rooms | Where-Object { $_.activeAllocationCount -gt 0 })
    if ($allocated.Count -ge 1) {
        $rid = $allocated[0].id
        $arc = Invoke-Api -Method PATCH -Uri "$base/api/rooms/$rid/archive" -Headers $hAdmin -ExpectStatus @(409)
        $hasMsg = $arc.Body -match "allocated|Deallocate|assets"
        Add-Result "room_archive_blocked_when_allocated" ($arc.Ok -and $hasMsg) "code=$($arc.Code)"
    }
    else {
        Add-Result "room_archive_blocked_when_allocated" $true "SKIP (no room with activeAllocationCount>0 in DB)"
    }
}
catch {
    Add-Result "rooms_list_or_archive_test" $false $_.Exception.Message
}

# Maintenance must not archive rooms (no permission or blocked)
$roomsForMaint = Invoke-RestMethod -Uri "$base/api/rooms?showArchived=false" -Headers $hAdmin
if ($roomsForMaint.Count -gt 0) {
    $anyRoomId = $roomsForMaint[0].id
    $mRoomTry = Invoke-Api -Method PATCH -Uri "$base/api/rooms/$anyRoomId/archive" -Headers $hMaint -ExpectStatus @(403, 404, 409)
    Add-Result "maintenance_room_archive_denied_or_conflict" ($mRoomTry.Code -ne 200) "code=$($mRoomTry.Code)"
}
else {
    Add-Result "maintenance_room_archive_denied_or_conflict" $true "SKIP (no rooms)"
}

# --- Room categories: archive when rooms assigned -> 409 ---
try {
    $cats = Invoke-RestMethod -Uri "$base/api/roomcategories?showArchived=false" -Headers $hAdmin
    $busy = @($cats | Where-Object { $_.roomCount -gt 0 })
    if ($busy.Count -ge 1) {
        $cid = $busy[0].id
        $carc = Invoke-Api -Method PATCH -Uri "$base/api/roomcategories/$cid/archive" -Headers $hAdmin -ExpectStatus @(409)
        $cmsg = $carc.Body -match "room unit|assigned|category"
        Add-Result "category_archive_blocked_when_rooms" ($carc.Ok -and $cmsg) "code=$($carc.Code)"
    }
    else {
        Add-Result "category_archive_blocked_when_rooms" $true "SKIP (no category with roomCount>0)"
    }
}
catch {
    Add-Result "category_archive_test" $false $_.Exception.Message
}

# --- Finance notification after maintenance corrective create ---
try {
    $allocs = Invoke-RestMethod -Uri "$base/api/maintenance/allocated-assets" -Headers $hMaint
    if ($allocs.Count -ge 1) {
        $a0 = $allocs[0]
        $b = (@{
                assetId     = $a0.assetId
                roomId      = $a0.roomId
                description = "CLI verify corrective finance notify"
                frequency   = "One-time"
                startDate   = "2026-04-12"
                status      = "Pending"
                type        = "Corrective"
            } | ConvertTo-Json)
        Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers $hMaint -ContentType "application/json" -Body $b | Out-Null
        $financeTok = Get-Token "finance.alpha@dfile.com" "finance123"
        $notifs = Invoke-RestMethod -Uri "$base/api/notifications" -Headers (Auth $financeTok)
        $hit = @($notifs | Where-Object { $_.message -match "corrective|repair request" })
        Add-Result "finance_notification_after_corrective" ($hit.Count -ge 1) "matches=$($hit.Count)"
    }
    else {
        Add-Result "finance_notification_after_corrective" $true "SKIP (no allocated assets for maintenance)"
    }
}
catch {
    Add-Result "finance_notification_after_corrective" $false $_.Exception.Message
}

$results | Format-Table -AutoSize
$failed = @($results | Where-Object { -not $_.Pass })
if ($failed.Count -gt 0) {
    Write-Host "FAILURES:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  $($_.Test): $($_.Detail)" }
    exit 1
}
Write-Host "ALL PASS" -ForegroundColor Green
exit 0
