$ErrorActionPreference = "Continue"
$base = "http://localhost:5090"

Write-Host "`n=== Testing DFile API ===" -ForegroundColor Cyan

# Login
try {
    $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin.alpha@dfile.com","password":"admin123"}'
    $token = $login.token
    Write-Host "Login: OK (token length $($token.Length))" -ForegroundColor Green
} catch {
    Write-Host "Login FAILED: $_" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $token" }

# Test endpoints
$endpoints = @("AssetCategories","Rooms","Assets","Departments","Employees","Roles","RoomCategories","PurchaseOrders")
foreach ($ep in $endpoints) {
    try {
        $resp = Invoke-RestMethod -Uri "$base/api/$ep" -Headers $headers
        $count = if ($resp -is [array]) { $resp.Count } else { 1 }
        Write-Host "${ep}: $count items" -ForegroundColor Green
    } catch {
        Write-Host "${ep}: FAILED ($($_.Exception.Response.StatusCode))" -ForegroundColor Red
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
