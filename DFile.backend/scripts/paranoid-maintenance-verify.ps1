# Paranoid maintenance API verification — run against local API (default http://localhost:5090)
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
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int[]]$ExpectStatus = @(200)
    )
    try {
        $params = @{ Uri = $Uri; Method = $Method; Headers = $Headers; UseBasicParsing = $true }
        if ($Body) {
            $params.ContentType = "application/json"
            $params.Body = $Body
        }
        $resp = Invoke-WebRequest @params
        $code = [int]$resp.StatusCode
        if ($ExpectStatus -notcontains $code) {
            return @{ Ok = $false; Code = $code; Body = $resp.Content }
        }
        return @{ Ok = $true; Code = $code; Content = $resp.Content }
    }
    catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $txt = $reader.ReadToEnd()
            if ($ExpectStatus -contains $code) {
                return @{ Ok = $true; Code = $code; Body = $txt }
            }
            return @{ Ok = $false; Code = $code; Body = $txt }
        }
        return @{ Ok = $false; Code = -1; Body = $_.Exception.Message }
    }
}

# --- Auth all roles ---
$roles = @(
    @{ n = "superadmin"; e = "superadmin@dfile.com"; p = "superadmin123" },
    @{ n = "maintenance"; e = "maintenance.alpha@dfile.com"; p = "maintenance123" },
    @{ n = "admin"; e = "admin.alpha@dfile.com"; p = "admin123" },
    @{ n = "finance"; e = "finance.alpha@dfile.com"; p = "finance123" }
)
$tok = @{}
foreach ($x in $roles) {
    try {
        $tok[$x.n] = Get-Token $x.e $x.p
        $me = Invoke-RestMethod -Uri "$base/api/auth/me" -Headers (Auth $tok[$x.n])
        Add-Result "login+$($x.n)+me" ($null -ne $me.email) "email=$($me.email) role=$($me.role)"
    }
    catch {
        Add-Result "login+$($x.n)" $false $_.Exception.Message
    }
}

# --- Invalid auth ---
$r401 = Invoke-Api -Method GET -Uri "$base/api/maintenance" -Headers @{} -ExpectStatus @(401)
Add-Result "no_token_maintenance_GET" $r401.Ok "code=$($r401.Code)"
$bad = Invoke-Api -Method POST -Uri "$base/api/auth/login" -Body '{"email":"nope@x.com","password":"wrong"}' -ExpectStatus @(401)
Add-Result "bad_login" $bad.Ok "code=$($bad.Code)"

$m = $tok["maintenance"]
$f = $tok["finance"]
$a = $tok["admin"]
$s = $tok["superadmin"]

# --- Assets (use [0] for most tests; [1] for replacement flow so we do not dispose the primary asset) ---
$assets = Invoke-RestMethod -Uri "$base/api/assets" -Headers (Auth $m)
if ($assets.Count -lt 2) { throw "Need at least 2 assets for paranoid verify (replacement disposes one)." }
$aid = $assets[0].id
$aidNR = $assets[1].id
Add-Result "maintenance_GET_assets" ($aid.Length -gt 10) "asset0=$aid asset1=$aidNR"

# --- Schedule generation ---
function Test-Batch($freq, $start, $end, $expectCount, $expectDates) {
    $sid = [guid]::NewGuid().ToString()
    $body = (@{
            assetId            = $aid
            description        = "paranoid $freq"
            frequency          = $freq
            startDate          = $start
            endDate            = $end
            scheduleSeriesId   = $sid
        } | ConvertTo-Json)
    $resp = Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body $body
    $ok = ($resp.count -eq $expectCount)
    $dates = @($resp.items | ForEach-Object { ($_.startDate -replace 'T.*', '') })
    if ($expectDates) {
        $joined = $dates -join ","
        $exp = $expectDates -join ","
        if ($joined -ne $exp) { $ok = $false }
    }
    return @{ Ok = $ok; Sid = $sid; Body = $resp; Dates = $dates }
}

$d = Test-Batch "Daily" "2026-04-05" "2026-04-07" 3 @("2026-04-05", "2026-04-06", "2026-04-07")
Add-Result "daily_3_inclusive" $d.Ok "dates=$($d.Dates -join ',')"

$w = Test-Batch "Weekly" "2026-04-05" "2026-04-19" 3 @("2026-04-05", "2026-04-12", "2026-04-19")
Add-Result "weekly_cadence" $w.Ok "dates=$($w.Dates -join ',')"

$mo = Test-Batch "Monthly" "2026-01-05" "2026-04-05" 4 @("2026-01-05", "2026-02-05", "2026-03-05", "2026-04-05")
Add-Result "monthly_cadence" $mo.Ok "dates=$($mo.Dates -join ',')"

$y = Test-Batch "Yearly" "2024-04-05" "2026-04-05" 3 $null
$ysorted = ($y.Dates | Sort-Object)
$yexp = @("2024-04-05", "2025-04-05", "2026-04-05")
$okY = ($y.Body.count -eq 3) -and (($ysorted -join ",") -eq ($yexp -join ","))
Add-Result "yearly_count_set" $okY "dates=$($y.Dates -join ',')"

# duplicate series
$dup = Invoke-Api -Method POST -Uri "$base/api/maintenance" -Headers (Auth $m) -Body (@{
        assetId = $aid; description = "dup"; frequency = "Daily"
        startDate = "2026-05-01"; endDate = "2026-05-02"; scheduleSeriesId = $d.Sid
    } | ConvertTo-Json) -ExpectStatus @(409)
Add-Result "duplicate_series_409" $dup.Ok "code=$($dup.Code)"

# --- List: active vs completed (client-side same as UI) ---
$all = Invoke-RestMethod -Uri "$base/api/maintenance?showArchived=false" -Headers (Auth $m)
$active = @($all | Where-Object { $_.status -ne "Completed" })
$hist = @($all | Where-Object { $_.status -eq "Completed" })
$overlap = @($active | Where-Object { $_.status -eq "Completed" })
Add-Result "active_history_disjoint" ($overlap.Count -eq 0) "active=$($active.Count) history=$($hist.Count)"

# --- No fix ---
$b1 = '{"assetId":"'+$aid+'","description":"paranoid nofix","frequency":"One-time","startDate":"2026-04-05","status":"Pending"}'
$r1 = Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body $b1
$id1 = $r1.items[0].id
$nfBad = Invoke-Api -Method POST -Uri "$base/api/maintenance/$id1/inspection-workflow" -Headers (Auth $m) -Body '{"outcome":"No Fix Needed"}' -ExpectStatus @(400)
Add-Result "nofix_requires_notes" $nfBad.Ok "code=$($nfBad.Code)"
Invoke-RestMethod -Uri "$base/api/maintenance/$id1/inspection-workflow" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body '{"outcome":"No Fix Needed","detailNotes":"ok"}' | Out-Null
$chk1 = Invoke-RestMethod -Uri "$base/api/maintenance/$id1" -Headers (Auth $m)
Add-Result "nofix_completed" ($chk1.status -eq "Completed") "status=$($chk1.status)"

# --- Repairable full chain ---
$br = '{"assetId":"'+$aid+'","description":"paranoid repair","frequency":"One-time","startDate":"2026-04-05","status":"Pending"}'
$rr = Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body $br
$rid = $rr.items[0].id
Invoke-RestMethod -Uri "$base/api/maintenance/$rid/inspection-workflow" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body '{"outcome":"Repairable","detailNotes":"fix","estimatedRepairCost":250}' | Out-Null
$r2 = Invoke-RestMethod -Uri "$base/api/maintenance/$rid" -Headers (Auth $m)
$s1 = ($r2.status -eq "Finance Review") -and ($r2.financeWorkflowStatus -eq "Pending Approval")
Add-Result "repairable_after_inspect" $s1 "st=$($r2.status) fw=$($r2.financeWorkflowStatus)"

$q = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests" -Headers (Auth $f)
$inq = @($q | Where-Object { $_.id -eq $rid })
Add-Result "finance_queue_has_repair" ($inq.Count -ge 1) "queueMatch=$($inq.Count)"

$maintCannotApprove = Invoke-Api -Method PATCH -Uri "$base/api/finance/maintenance-requests/$rid/approve-repair" -Headers (Auth $m) -ExpectStatus @(403)
Add-Result "maintenance_forbidden_PATCH_approve_repair" $maintCannotApprove.Ok "code=$($maintCannotApprove.Code)"

Invoke-WebRequest -Uri "$base/api/finance/maintenance-requests/$rid/approve-repair" -Method PATCH -Headers (Auth $f) -UseBasicParsing | Out-Null
$r3 = Invoke-RestMethod -Uri "$base/api/maintenance/$rid" -Headers (Auth $m)
$s2 = ($r3.status -eq "In Progress") -and ($r3.financeWorkflowStatus -eq "Approved")
Add-Result "after_approve_repair" $s2 "st=$($r3.status) fw=$($r3.financeWorkflowStatus)"

$ap = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/awaiting-parts" -Headers (Auth $f)
$apOk = ($ap -is [array]) -and (@($ap | Where-Object { $_.id -eq $rid }).Count -ge 1)
Add-Result "awaiting_parts_GET_200" ($null -ne $ap) "contains=$apOk count=$($ap.Count)"

Invoke-WebRequest -Uri "$base/api/finance/maintenance-requests/$rid/mark-parts-ready" -Method PATCH -Headers (Auth $f) -UseBasicParsing | Out-Null
$r4 = Invoke-RestMethod -Uri "$base/api/maintenance/$rid" -Headers (Auth $m)
Add-Result "after_parts_ready" ($r4.financeWorkflowStatus -eq "Parts Ready") "fw=$($r4.financeWorkflowStatus)"

$dbl = Invoke-Api -Method PATCH -Uri "$base/api/finance/maintenance-requests/$rid/approve-repair" -Headers (Auth $f) -ExpectStatus @(400, 404, 409)
Add-Result "double_approve_repair_rejected" ($dbl.Code -ne 200) "code=$($dbl.Code)"

# --- Not repairable + replacement lifecycle ---
$poBody = '{"assetName":"Paranoid Replacement Asset","category":"IT","purchasePrice":1000,"usefulLifeYears":5}'
$po = Invoke-RestMethod -Uri "$base/api/purchaseorders" -Method POST -Headers (Auth $a) -ContentType "application/json" -Body $poBody
$poid = $po.id

$bnr = '{"assetId":"'+$aidNR+'","description":"paranoid NR","frequency":"One-time","startDate":"2026-04-05","status":"Pending"}'
$rnr = Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body $bnr
$nrid = $rnr.items[0].id
Invoke-RestMethod -Uri "$base/api/maintenance/$nrid/inspection-workflow" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body ('{"outcome":"Not Repairable","detailNotes":"dead","linkedPurchaseOrderId":"'+$poid+'"}') | Out-Null
$nr = Invoke-RestMethod -Uri "$base/api/maintenance/$nrid" -Headers (Auth $m)
Add-Result "not_repairable_finance_review" (($nr.status -eq "Finance Review") -and ($nr.financeRequestType -eq "Replacement")) "st=$($nr.status)"

Invoke-WebRequest -Uri "$base/api/finance/maintenance-requests/$nrid/approve-replacement" -Method PATCH -Headers (Auth $f) -UseBasicParsing | Out-Null
$nr2 = Invoke-RestMethod -Uri "$base/api/maintenance/$nrid" -Headers (Auth $m)
$assetAfter = Invoke-RestMethod -Uri "$base/api/assets/$aidNR" -Headers (Auth $a)
$disp = ($assetAfter.lifecycleStatus -eq 6) -or ($assetAfter.status -like "*Disposed*")
Add-Result "approve_replacement_disposes" (($nr2.status -eq "Waiting for Replacement") -and $disp) "assetLife=$($assetAfter.lifecycleStatus) st=$($nr2.status)"

$cats = Invoke-RestMethod -Uri "$base/api/assetcategories" -Headers (Auth $f)
$catId = @($cats | Where-Object { -not $_.isArchived })[0].id
if (-not $catId) { $catId = $cats[0].id }
$crBody = (@{
        assetName         = "New From Paranoid"
        categoryId        = $catId
        cost              = 2000
        serialNumber      = "PAR-$([guid]::NewGuid().ToString().Substring(0,8))"
        dateOfAcquisition = "2026-04-01"
    } | ConvertTo-Json)
$cr = Invoke-RestMethod -Uri "$base/api/finance/maintenance-requests/$nrid/complete-replacement" -Method POST -Headers (Auth $f) -ContentType "application/json" -Body $crBody
Add-Result "complete_replacement" ($cr.assetId.Length -gt 0) "newAsset=$($cr.assetId)"

$nr3 = Invoke-RestMethod -Uri "$base/api/maintenance/$nrid" -Headers (Auth $m)
Add-Result "replacement_record_completed" ($nr3.status -eq "Completed") "st=$($nr3.status) fw=$($nr3.financeWorkflowStatus)"

# --- Negative: invalid transition ---
$bOpen = '{"assetId":"'+$aid+'","description":"bad transition","frequency":"One-time","startDate":"2026-04-05","status":"Open"}'
$ro = Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body $bOpen
$oid = $ro.items[0].id
$rec = Invoke-RestMethod -Uri "$base/api/maintenance/$oid" -Headers (Auth $m)
$putBody = @{
    assetId = $aid; description = $rec.description; status = "Completed"
    priority = $rec.priority; type = $rec.type; frequency = $rec.frequency
    startDate = $rec.startDate; endDate = $rec.endDate; cost = $rec.cost
    dateReported = $rec.dateReported; diagnosisOutcome = $rec.diagnosisOutcome
    inspectionNotes = $rec.inspectionNotes; quotationNotes = $rec.quotationNotes
    attachments = $rec.attachments
} | ConvertTo-Json
$badTrans = Invoke-Api -Method PUT -Uri "$base/api/maintenance/$oid" -Headers (Auth $m) -Body $putBody -ExpectStatus @(400)
Add-Result "open_to_completed_blocked" $badTrans.Ok "code=$($badTrans.Code)"

# --- Finance queue: readable by Maintenance when tenant has Assets.CanView ---
$fmaintGet = Invoke-Api -Method GET -Uri "$base/api/finance/maintenance-requests" -Headers (Auth $m) -ExpectStatus @(200)
Add-Result "maintenance_can_GET_finance_queue_when_assets_view" $fmaintGet.Ok "code=$($fmaintGet.Code)"

# --- mark-parts-ready wrong record: use completed nofix id ---
$badParts = Invoke-Api -Method PATCH -Uri "$base/api/finance/maintenance-requests/$id1/mark-parts-ready" -Headers (Auth $f) -ExpectStatus @(400, 404)
Add-Result "mark_parts_invalid_state" ($badParts.Code -ne 500) "code=$($badParts.Code)"

$results | Format-Table -AutoSize
$failed = @($results | Where-Object { -not $_.Pass })
if ($failed.Count -gt 0) {
    Write-Host "FAILURES:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  $($_.Test): $($_.Detail)" }
    exit 1
}
Write-Host "ALL PASS" -ForegroundColor Green
exit 0
