# Minimal persistence proof: create on primary API, verify SQL, read from a SECOND API process (same DB), stop second process.
# Exam-ready narrative: docs/DATABASE_PERSISTENCE_VERIFICATION.md
# Requires: primary API on DFILE_API_BASE or http://127.0.0.1:5090, LocalDB + appsettings.Development.json connection, dotnet + sqlcmd.
$ErrorActionPreference = "Stop"
$base = if ($env:DFILE_API_BASE) { $env:DFILE_API_BASE.TrimEnd("/") } else { "http://127.0.0.1:5090" }
$altPort = if ($env:DFILE_PERSIST_ALT_PORT) { [int]$env:DFILE_PERSIST_ALT_PORT } else { 5091 }
$baseAlt = "http://127.0.0.1:$altPort"
$scriptRoot = $PSScriptRoot
$backendRoot = Split-Path $scriptRoot -Parent
$devSettings = Join-Path $backendRoot "appsettings.Development.json"
if (-not (Test-Path $devSettings)) { throw "Missing $devSettings" }
$cs = (Get-Content $devSettings -Raw | ConvertFrom-Json).ConnectionStrings.DefaultConnection
if ($cs -notmatch "Database=([^;]+)") { throw "Could not parse Database= from DefaultConnection" }
$dbName = $matches[1].Trim()
if ($cs -notmatch "Server=([^;]+)") { throw "Could not parse Server= from DefaultConnection" }
$sqlServer = $matches[1].Trim()

function Get-Token([string]$email, [string]$password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body $body
    if (-not $r.token) { throw "No token for $email" }
    return [string]$r.token
}
function Auth([string]$t) { return @{ Authorization = "Bearer $t" } }
function Normalize-RestArray($Raw) {
    if ($null -eq $Raw) { return @() }
    if ($Raw -is [System.Array]) { return @($Raw) }
    return @($Raw)
}
function Wait-Health([string]$root, [int]$seconds = 90) {
    $dead = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $dead) {
        try {
            $h = Invoke-WebRequest -Uri "$root/api/health" -UseBasicParsing -TimeoutSec 2
            if ($h.StatusCode -eq 200) { return }
        }
        catch { }
        Start-Sleep -Milliseconds 500
    }
    throw "Health check failed for $root within ${seconds}s"
}

$marker = "PERSIST-" + [guid]::NewGuid().ToString("N")
Write-Host "Marker: $marker"

Write-Host "Logging in..."
$a = Get-Token "admin.alpha@dfile.com" "admin123"
$m = Get-Token "maintenance.alpha@dfile.com" "maintenance123"

$cats = Normalize-RestArray (Invoke-RestMethod -Uri "$base/api/AssetCategories" -Headers (Auth $a))
$cid = ($cats | Select-Object -First 1).id
if (-not $cid) { $cid = ($cats | Select-Object -First 1).Id }
if (-not $cid) { throw "No asset category" }

$serial = "PERS-SER-" + [guid]::NewGuid().ToString("N")
$assetPayload = @{
    assetName         = $marker
    categoryId        = [string]$cid
    acquisitionCost   = 50
    purchasePrice     = 50
    usefulLifeYears   = 5
    currentCondition  = 0
    lifecycleStatus   = 0
    serialNumber      = $serial
} | ConvertTo-Json -Depth 5

Write-Host "POST /api/assets..."
$asset = Invoke-RestMethod -Uri "$base/api/assets" -Method POST -Headers (Auth $a) -ContentType "application/json" -Body $assetPayload
$assetId = [string]$asset.id
if ([string]::IsNullOrWhiteSpace($assetId)) { throw "No asset id returned" }

Write-Host "GET /api/assets/$assetId (immediate)..."
$g1 = Invoke-RestMethod -Uri "$base/api/assets/$assetId" -Headers (Auth $a)
if ($g1.assetName -ne $marker) { throw "Immediate readback mismatch: $($g1.assetName)" }

Write-Host "SQL row check (Assets)..."
$q = "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Assets WHERE Id = N'$assetId' AND AssetName = N'$marker' AND IsArchived = 0;"
$cnt = & sqlcmd -S $sqlServer -d $dbName -h -1 -W -Q $q
$cnt = ($cnt | ForEach-Object { $_.Trim() }) -join ""
if ($cnt -ne "1") { throw "sqlcmd expected 1 row, got '$cnt'" }

# Ensure active allocation (required for POST /api/maintenance)
$act = Normalize-RestArray (Invoke-RestMethod -Uri "$base/api/allocations/active" -Headers (Auth $a))
$hasAlloc = @($act | Where-Object { $_.assetId -eq $assetId }).Count -ge 1
if (-not $hasAlloc) {
    $rooms = Normalize-RestArray (Invoke-RestMethod -Uri "$base/api/rooms" -Headers (Auth $a))
    if ($rooms.Count -lt 1) { throw "Need a room to allocate asset" }
    $rid = $rooms[0].id; if (-not $rid) { $rid = $rooms[0].Id }
    $rid = [string]$rid
    $ab = (@{ assetId = $assetId; roomId = $rid } | ConvertTo-Json -Depth 4)
    try {
        Invoke-WebRequest -Uri "$base/api/allocations" -Method POST -Headers (Auth $a) -ContentType "application/json" -Body $ab -UseBasicParsing | Out-Null
    }
    catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        if ($code -ne 409) { throw "Allocation POST failed: $($_.Exception.Message)" }
    }
}

$rooms2 = Normalize-RestArray (Invoke-RestMethod -Uri "$base/api/rooms" -Headers (Auth $a))
$roomIdMaint = $rooms2[0].id; if (-not $roomIdMaint) { $roomIdMaint = $rooms2[0].Id }
$roomIdMaint = [string]$roomIdMaint
$maintBody = @{
    assetId       = $assetId
    roomId        = $roomIdMaint
    description   = "$marker-maint"
    type          = "Corrective"
    status        = "Open"
    frequency     = "One-time"
    startDate     = ([datetime]::UtcNow.Date.ToString("yyyy-MM-dd"))
} | ConvertTo-Json -Depth 5

Write-Host "POST /api/maintenance..."
$batch = Invoke-RestMethod -Uri "$base/api/maintenance" -Method POST -Headers (Auth $m) -ContentType "application/json" -Body $maintBody
$maintId = [string]$batch.items[0].id
$gMaint = Invoke-RestMethod -Uri "$base/api/maintenance/$maintId" -Headers (Auth $m)
if ($gMaint.description -ne "$marker-maint") { throw "Maintenance readback mismatch" }

$q2 = "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.MaintenanceRecords WHERE Id = N'$maintId' AND Description = N'$marker-maint';"
$cnt2 = & sqlcmd -S $sqlServer -d $dbName -h -1 -W -Q $q2
$cnt2 = ($cnt2 | ForEach-Object { $_.Trim() }) -join ""
if ($cnt2 -ne "1") { throw "sqlcmd maintenance expected 1 row, got '$cnt2'" }

Write-Host "Building Release and starting second API on $baseAlt (same database, skip migrations to avoid lock with primary)..."
Push-Location $backendRoot
try {
    dotnet build -c Release --verbosity quiet | Out-Null
}
finally {
    Pop-Location
}

$bin = Join-Path $backendRoot "bin\Release\net8.0"
$dll = Join-Path $bin "dfile.backend.dll"
if (-not (Test-Path $dll)) { throw "Release DLL not found: $dll (dotnet build -c Release failed?)" }

# Child: exec DLL from publish output dir so appsettings.json loads; avoid second Migrate() against DB already held by primary.
$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = "dotnet"
$pinfo.Arguments = "`"$dll`""
$pinfo.WorkingDirectory = $bin
$pinfo.UseShellExecute = $false
$pinfo.CreateNoWindow = $true
$pinfo.EnvironmentVariables["ASPNETCORE_URLS"] = $baseAlt
$pinfo.EnvironmentVariables["DFILE_SKIP_MIGRATIONS"] = "1"
$pinfo.EnvironmentVariables["ASPNETCORE_ENVIRONMENT"] = "Development"
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $pinfo
[void]$proc.Start()
try {
    try {
        Wait-Health $baseAlt 45
    }
    catch {
        if ($proc.HasExited) {
            throw "Second API process exited (code $($proc.ExitCode)). First error: $($_.Exception.Message)"
        }
        throw $_
    }

    Write-Host "GET asset + maintenance on SECOND process ($baseAlt)..."
    $g1b = Invoke-RestMethod -Uri "$baseAlt/api/assets/$assetId" -Headers (Auth $a)
    if ($g1b.assetName -ne $marker) { throw "Alt API asset readback mismatch: $($g1b.assetName)" }
    $gMaintB = Invoke-RestMethod -Uri "$baseAlt/api/maintenance/$maintId" -Headers (Auth $m)
    if ($gMaintB.description -ne "$marker-maint") { throw "Alt API maintenance readback mismatch" }

    Write-Host "SECOND_PROCESS_READBACK: PASS"
}
finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "PERSISTENCE_VERIFY: PASS (marker=$marker asset=$assetId maint=$maintId)"
