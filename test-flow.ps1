$ErrorActionPreference = "Continue"
$base = "http://localhost:5090"

Write-Host "`n=== Full Browser Flow Simulation ===" -ForegroundColor Cyan

# 1. Login
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin.alpha@dfile.com","password":"admin123"}'
Write-Host "1. Login OK: $($login.user.firstName) $($login.user.lastName) (role=$($login.user.role), tenantId=$($login.user.tenantId))" -ForegroundColor Green
$headers = @{ Authorization = "Bearer $($login.token)" }

# 2. GET /api/auth/me
try {
    $me = Invoke-RestMethod -Uri "$base/api/auth/me" -Headers $headers
    Write-Host "2. /api/auth/me OK: $($me.firstName) $($me.lastName) (role=$($me.role))" -ForegroundColor Green
} catch {
    Write-Host "2. /api/auth/me FAILED: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# 3. Dashboard data
$endpoints = @("Employees","Roles","Departments","Rooms","AssetCategories","Assets","RoomCategories","PurchaseOrders")
Write-Host "3. Dashboard data:" -ForegroundColor Cyan
foreach ($ep in $endpoints) {
    try {
        $data = Invoke-RestMethod -Uri "$base/api/$ep" -Headers $headers
        $count = if ($data -is [array]) { $data.Count } else { 1 }
        Write-Host "   $ep : $count items" -ForegroundColor Green
    } catch {
        Write-Host "   $ep : FAILED ($($_.Exception.Response.StatusCode))" -ForegroundColor Red
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
