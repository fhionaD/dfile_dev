# DFile — Copilot Instructions

---

## ⚠️ Production-First Law (Non-Negotiable)

**Every code change must be treated as a public production deployment.** Before writing any code:
- Zero mock data, zero placeholder auth, zero `console.log` debugging, zero TODO comments
- All CRUD must be complete and connected to the real database
- No development shortcuts in any committed code
- When a fix doesn't resolve an issue, investigate the current file and all related components before proposing a targeted correction — do not refactor unrelated code

---

## Architecture Overview

Single-host, two-project monorepo:
- **`DFile.backend/`** — .NET 8 ASP.NET Core Web API (SQL Server, JWT, EF Core). Serves both `/api/*` routes **and** the compiled frontend from `wwwroot/`.
- **`DFile.frontend/`** — Next.js 16 app (TypeScript, Tailwind v4, shadcn/ui). Built as a **static export** (`output: 'export'`), output lands in `out/` which is copied to `DFile.backend/wwwroot/` at build time.

The backend is the **only process at runtime** — there is no separate Node.js server in production.

```
Browser → /api/*  → ASP.NET Core controllers → SQL Server (external)
Browser → /*      → UseStaticFiles() / MapFallbackToFile("index.html") → wwwroot/
```

`NEXT_PUBLIC_API_URL` must be **empty** for same-origin deployments (production, Docker). Only set it when frontend and backend run on different hosts.

---

## Separation of Responsibilities (Absolute)

| Concern | Owner |
|---|---|
| Business logic, validation, auth, RBAC, DB access | **Backend only** |
| UI rendering, state management, API consumption, UX-only validation | **Frontend only** |

Never put business logic in the frontend. Never access the database from the frontend. Never duplicate backend validation rules in the frontend.

---

## Developer Workflows

### Frontend dev (live reload, proxied API)
```powershell
cd DFile.frontend ; npm run dev    # Proxies /api/* → http://localhost:5090
```
The proxy is in `next.config.ts` `rewrites()` — applies only during `next dev`, ignored on static export.

### Backend dev
```powershell
cd DFile.backend ; dotnet run      # Listens on http://localhost:5090
```

### Build frontend → wwwroot (Windows / FTP deployment)
```powershell
cd DFile.frontend ; npm run build  # next build + postbuild copy → DFile.backend/wwwroot/
```
The `postbuild` step runs `scripts/copy-wwwroot.cjs` (Node `fs.cpSync`, all platforms). For Docker use the root `Dockerfile` instead.

### FTP / IIS deployment steps
```powershell
cd DFile.frontend ; npm run build                         # 1. Export Next.js → out/ → wwwroot/
cd DFile.backend ; dotnet publish -c Release -o ./publish # 2. Publish .NET
# 3. FTP upload: entire ./publish folder to hosting
# web.config must be present — it is committed and excluded from SDK overwrite
```
Never upload `node_modules`, source files, or a development build.

### Docker (full stack)
```powershell
docker compose up --build   # Builds frontend + backend, serves on http://localhost:8080
```

---

## Backend Patterns

### Program.cs middleware order (must not be changed)
```csharp
app.UseStaticFiles();          // FIRST — short-circuits asset requests before auth/CORS
// Swagger — development environment only
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();          // all /api/* routes
app.Map("/api/{**rest}", ...)  // explicit 404 for unmatched /api paths
app.MapFallbackToFile("index.html"); // SPA fallback — MUST BE LAST
```

### Controllers
- Route convention: `[Route("api/[controller]")]` — maps to `/api/<pluralname>`
- Inject only `AppDbContext` and `IConfiguration` — no service layer, EF Core direct
- All protected endpoints use `[Authorize]`; roles are plain strings matched against `user.Role`
- Return proper HTTP status codes; never return raw exception messages or stack traces

### Authentication
JWT — key from `Configuration["Jwt:Key"]`. `ValidateIssuer` and `ValidateAudience` both `false`. Passwords hashed with BCrypt (`BCrypt.Net.BCrypt`).

### DB / Migrations
- `DbInitializer.Initialize(context)` runs in a background `Task` at startup — never on `app.Run()` path
- It calls `context.Database.Migrate()` then seeds default tenant + users
- New migrations: `dotnet ef migrations add <Name>` from `DFile.backend/`
- Never auto-drop the database in production
- Use EF Core parameterized queries; avoid N+1 patterns

### Environment / Config
- Secrets via `appsettings.json` (base) + `appsettings.Production.json` (override) + env vars
- Docker/production connection string override: `ConnectionStrings__DefaultConnection` (double-underscore = nested key)
- Same pattern for JWT: `Jwt__Key`
- Never hardcode credentials or base URLs

---

## Frontend Patterns

### API calls — always use the central Axios instance
```typescript
import api from '@/lib/api';   // Never use fetch() or a raw axios instance
const { data } = await api.get<Asset[]>('/api/assets');
```
`api.ts` attaches `Authorization: Bearer <token>` from `localStorage.dfile_token` on every request.

### Server state — TanStack Query hooks in `src/hooks/`
One hook file per domain (`use-assets.ts`, `use-rooms.ts`, etc.). All hooks use typed `queryKey` arrays and call `queryClient.invalidateQueries` inside `onSuccess`. Add new API operations to the matching hook file — never inline in a component. Global `QueryClient` config: `staleTime: 60000`, `refetchOnWindowFocus: false`.

### Auth — `AuthContext` (`src/contexts/auth-context.tsx`)
- Token + user stored in `localStorage` as `dfile_token` / `dfile_user`
- On mount: optimistic restore → re-validate via `GET /api/auth/me` → `logout()` on failure
- Read state via `useAuth()` hook (wraps `useContext(AuthContext)`)

### Role-based UI
`UserRole`: `'Super Admin' | 'Admin' | 'Finance' | 'Maintenance' | 'Procurement' | 'Employee'`

Nav items declare `allowedRoles?: UserRole[]` — items without the array are visible to all roles. Super Admin has no `TenantId` (platform level). Tenant-scoped users always have a `TenantId`.

Role → namespace mapping (from `src/lib/role-routing.ts`):
| Role | Namespace | Dashboard path |
|---|---|---|
| `Super Admin` | `/superadmin` | `/superadmin/dashboard` |
| `Admin` | `/tenantadmin` | `/tenantadmin/dashboard` |
| `Finance` | `/financemanager` | `/financemanager/dashboard` |
| `Maintenance` | `/maintenancemanager` | `/maintenancemanager/dashboard` |
| `Procurement` | `/tenantadmin` | `/tenantadmin/dashboard` |
| `Employee` | `/tenantadmin` | `/tenantadmin/dashboard` |

Role-namespaced pages live in `src/app/<namespace>/`. There is no shared `/dashboard/` route directory — it was removed. The single common shell is `src/components/app-shell.tsx`.

### Types
All shared interfaces live in **`src/types/asset.ts`** (`Asset`, `Room`, `User`, `Category`, `MaintenanceRecord`, `Tenant`, etc.) and **`src/types/task.ts`**. Extend them there — never define domain types inline in components.

### UI components
- shadcn/ui primitives in `src/components/ui/`
- Domain modals in `src/components/modals/` — one file per entity action
- Toast notifications via `sonner` (`toast.success(...)` / `toast.error(...)`)
- Theme: `next-themes` with `ThemeProvider` wrapping the root layout

---

## Full CRUD Requirements (Every Module)

Each domain feature must have **all** of the following before it is considered complete:

**Backend:** Model → `AppDbContext` registration → Migration → Controller → DTOs → HTTP status codes → `[Authorize]`

**Frontend:** List view → Create form → Edit form → Delete with confirmation dialog → Loading state → Error state → Empty state → real API calls via hook in `src/hooks/`

No partial CRUD is acceptable.

---

## API Stability

- Do not rename endpoints or change JSON response shapes without explicit instruction
- If a breaking change is required, explain the impact and wait for approval before implementing

---

## Debugging Discipline

- Identify root cause; apply the minimal targeted correction
- Do not refactor unrelated modules, rename structures, or redesign UI as part of a bug fix
- Do not modify layout, file structure, or working features unless explicitly asked

---

## Key Files
| File | Purpose |
|---|---|
| `DFile.backend/Program.cs` | Middleware pipeline order, CORS, JWT, SPA fallback |
| `DFile.backend/Data/DbInitializer.cs` | Migrations + seed data (tenants, users) |
| `DFile.backend/web.config` | IIS/FTP deployment — committed, SDK overwrite disabled |
| `DFile.frontend/src/lib/api-base-url.ts` | `NEXT_PUBLIC_API_URL` resolution + guard logic |
| `DFile.frontend/src/lib/api.ts` | Axios instance with JWT interceptor |
| `DFile.frontend/src/contexts/auth-context.tsx` | Auth state, login/logout, session re-validation |
| `DFile.frontend/src/types/asset.ts` | All shared domain interfaces |
| `DFile.frontend/src/components/app-shell.tsx` | App shell with nav, sidebar, role filtering |
| `Dockerfile` | Root multi-stage build (frontend → backend → runtime) |
| `docker-compose.yml` | Single-service compose with env var overrides |

---

## Production Readiness Checklist

A feature is production-ready only when all of the following are true:
- [ ] No mock data
- [ ] No `console.log` / debug output
- [ ] No TODO comments
- [ ] No incomplete CRUD (all list / create / edit / delete flows exist)
- [ ] No unsecured endpoints (`[Authorize]` applied where required)
- [ ] No hardcoded credentials or URLs
- [ ] EF Core migration created and applied
- [ ] Next.js static export confirmed (`npm run build` produces valid `out/`)
- [ ] `out/` content copied to `wwwroot/` and tested via the .NET backend
- [ ] Production build tested end-to-end before FTP upload
