# DFile Deployment Guide

## Architecture Setup ✅

Your system is now configured for **Topology A: Single Host Deployment** where:
- **Frontend** (Next.js static export) is served from `/` in the backend's `wwwroot` folder
- **Backend** (ASP.NET Core) serves both the API (`/api/*`) and static frontend files
- **Single Origin**: Both frontend and backend operate on the same domain/port

This eliminates CORS issues and provides:
- No separation between frontend and backend deployments
- Relative API paths (`/api/auth/login` instead of `http://localhost:5090/api/auth/login`)
- Simplified deployment to shared hosting

---

## What Was Changed

### 1. **Frontend Configuration** (`DFile.frontend/`)

#### `next.config.ts`
- Changed `distDir` from default `out/` to `../DFile.backend/wwwroot`
- Frontend now builds directly into backend's `wwwroot` folder
- Removed hardcoded fallback paths

#### `.env.local` (Development)
- Changed `NEXT_PUBLIC_API_URL=http://localhost:5090/api` → **empty string**
- Empty string = use relative paths (`/api/*`)
- Frontend on port 3000 calls backend on port 5090 via relative paths

#### Removed Hardcoded URLs
Fixed these files to use relative paths instead of `http://localhost:5090/api`:
- `src/contexts/auth-context.tsx` - Auth login/validation
- `src/lib/api.ts` - Axios base configuration  
- `src/components/tenant-list.tsx` - Fetch calls

#### `.env.production` (Already correct)
- `NEXT_PUBLIC_API_URL=` (empty = relative paths)

### 2. **Backend Configuration** (`DFile.backend/`)

Your `Program.cs` already has everything configured correctly:
```csharp
app.UseDefaultFiles();           // Serve index.html for /
app.UseStaticFiles();             // Serve static files from wwwroot
app.UseCors("AllowAll");          // Allow cross-origin requests (if needed)
app.MapControllers();             // Map API routes
app.MapFallbackToFile("index.html"); // SPA fallback
```

This configuration:
- ✅ Serves static files from `wwwroot`
- ✅ Routes API calls to controllers
- ✅ Falls back to `index.html` for client-side routing

---

## Local Development Workflow

### Running Both Backend and Frontend Together

**Option 1: Run Backend Only (Recommended)**
```powershell
cd DFile.backend
dotnet run --urls="http://localhost:5090"
```

Then open: `http://localhost:5090`

- Frontend is served from wwwroot (built files)
- API calls use relative paths (`/api/*`)
- No CORS issues
- Closest to production setup

**Option 2: Run Backend + Separate Dev Frontend**
```powershell
# Terminal 1: Backend
cd DFile.backend
dotnet run --urls="http://localhost:5090"

# Terminal 2: Frontend dev server
cd DFile.frontend
npm run dev
```

Then open: `http://localhost:3000`

- Frontend dev server on port 3000 with hot reload
- Must have `NEXT_PUBLIC_API_URL=http://localhost:5090` in `.env.local`
- Uses relative paths in production (via `.env.production`)

**Note:** After running `npm run dev` locally, rebuild the static files:
```powershell
npm run build  # Rebuilds into DFile.backend/wwwroot
```

---

## MonsterASP.NET Deployment Steps

### Step 1: Clean & Build Everything

```powershell
# Clean
cd DFile\DFile.frontend
Remove-Item out -Recurse -Force -ErrorAction SilentlyContinue
cd ..\DFile.backend
dotnet clean

# Build Frontend (exports to backend/wwwroot)
cd ..\DFile.frontend
npm install  # If packages changed
npm run build

# Build Backend
cd ..\DFile.backend
dotnet build -c Release
```

### Step 2: Verify Local Deployment

```powershell
cd DFile.backend
dotnet run --urls="http://localhost:5090"
```

Test in browser:
- Homepage: `http://localhost:5090/` → Should show login page
- API Health: `http://localhost:5090/api/health` → Should return "API is Healthy"
- Swagger: `http://localhost:5090/swagger` → Should show API documentation

### Step 3: Publish to MonsterASP

#### Using MonsterASP Web Interface:
1. **Create or Update Site**
   - Keep root path as `/` (default)
   - Point to: `DFile\DFile.backend`

2. **Connection String**
   - Update `appsettings.json` or Web config with:
     ```json
     "DefaultConnection": "Server=YOUR_DB_HOST;Database=dfile_prod;User Id=YOUR_USER;Password=YOUR_PASS;"
     ```
   - Or set via MonsterASP environment variables

3. **Upload Files**
   - Upload entire `DFile.backend` folder
   - Ensure `wwwroot/index.html` and `_next/` folder are included

#### Using Git Push (If Available):
```powershell
git add .
git commit -m "Ready for MonsterASP: Frontend integrated into wwwroot"
git push
```

### Step 4: Post-Deployment Checklist

- [ ] **Frontend loads**: `https://dfile.runasp.net/`
- [ ] **API accessible**: `https://dfile.runasp.net/api/health` returns "API is Healthy"
- [ ] **No 404 on login**: POST `https://dfile.runasp.net/api/auth/login` works
- [ ] **Database connected**: `https://dfile.runasp.net/swagger` works
- [ ] **Swagger UI available**: Can test endpoints in Swagger
- [ ] **HTTPS redirect works** (if enabled)

---

## Troubleshooting

### Problem: Frontend loads but API returns 404

**Cause**: Backend not configured to serve static files

**Solution**: Ensure `Program.cs` has:
```csharp
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");
```

### Problem: Frontend loads but gets 404 on API calls

**Cause**: Frontend is making calls to wrong API endpoint

**Solution**: Check browser console (F12):
- Should show calls to `/api/*` (not `http://localhost:5090/api/*`)
- If hardcoded URLs exist, they're calling the wrong host

**Fix**: 
- Rebuild frontend: `npm run build`
- Ensure `.env.local` has `NEXT_PUBLIC_API_URL=`
- Restart backend

### Problem: CORS errors on API calls

**Cause**: Frontend and backend on different origins

**Solution**: Already configured in `Program.cs`:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});
```

### Problem: Web.config issues on IIS

**Solution**: If MonsterASP is IIS-based, ensure:
1. Project publishes with `dotnet publish -c Release`
2. `web.config` is generated correctly
3. Static file MIME types are configured

---

## Environment Variables

### Development (`.env.local`)
```dotenv
NEXT_PUBLIC_API_URL=
```
- Empty = Use relative paths
- Works because backend serves frontend

### Production (`.env.production`)  
```dotenv
NEXT_PUBLIC_API_URL=
```
- Empty = Use relative paths  
- Works because backend serves frontend from `wwwroot`

### For Split Deployment (If Needed Later)
If you need frontend on separate domain, change to:
```dotenv
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Then rebuild: `npm run build`

---

## File Structure After Build

```
DFile.backend/
├── wwwroot/              ← Frontend static files
│   ├── index.html        ← main entry point
│   ├── login/
│   ├── dashboard/
│   ├── _next/            ← Next.js optimized bundles
│   └── ...
├── Controllers/          ← API endpoints
├── Program.cs            ← Web server config
└── bin/Release/          ← Published binaries
```

---

## Quick Commands Reference

```powershell
# Build everything for deployment
cd DFile\DFile.frontend; npm run build

# Start backend only (production-like)
cd DFile\DFile.backend; dotnet run

# Clean start
dotnet clean; dotnet build; dotnet run

# Development with hot reload
cd DFile\DFile.frontend; npm run dev

# Check if backend is running
curl http://localhost:5090/api/health
```

---

## Summary

✅ **Setup Complete**: Frontend is integrated into backend's `wwwroot`  
✅ **API Paths**: Using relative paths (`/api/*`)  
✅ **Single Origin**: No CORS issues  
✅ **Production Ready**: Ready for MonsterASP deployment  

The system is now configured as a **single-host deployment**, which is the recommended approach for full-stack applications and eliminates the API 404 errors you were experiencing.
