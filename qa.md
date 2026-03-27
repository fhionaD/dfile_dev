# DFile System Audit — Full Stack Overview

> **Audit Date:** February 28, 2026
> **Codebase State:** Production-ready monorepo, single-host deployment

---

## Table of Contents

1. [What Is DFile](#1-what-is-dfile)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Role-Based Access & Workflows](#5-role-based-access--workflows)
6. [Module-by-Module Functional Breakdown](#6-module-by-module-functional-breakdown)
7. [API Endpoint Catalog](#7-api-endpoint-catalog)
8. [Frontend Route Map](#8-frontend-route-map)
9. [Current System Workflow (End-to-End)](#9-current-system-workflow-end-to-end)
10. [Seed Data & Initial State](#10-seed-data--initial-state)
11. [Known Gaps & Observations](#11-known-gaps--observations)

---

## 1. What Is DFile

DFile is a **multi-tenant asset management system** designed for organizations that need to track physical assets (IT equipment, furniture, vehicles, machinery, etc.) across rooms/locations, manage maintenance schedules, handle procurement workflows, and monitor financial depreciation.

### Core Capabilities

| Capability | Description |
|---|---|
| **Multi-Tenancy** | Platform supports multiple independent organizations (tenants), each with isolated data |
| **Asset Registration** | Full lifecycle tracking — create, categorize, tag, allocate to rooms, archive |
| **Asset Depreciation** | Straight-line depreciation auto-calculated from purchase price and useful life |
| **Room/Location Management** | Rooms organized by categories (Office, Conference, Warehouse, etc.) with occupancy tracking |
| **Maintenance Tracking** | Preventive/corrective maintenance records linked to specific assets |
| **Task Management** | Work tasks assigned to employees with priority, status, and due dates |
| **Purchase Orders** | Procurement workflow from request through approval to delivery |
| **Organization Structure** | Departments, roles, and employee records per tenant |
| **Role-Based Access** | Six distinct roles with different dashboards, permissions, and navigation |
| **Subscription Plans** | Starter / Basic / Pro tiers controlling feature limits per tenant |

### What DFile Is NOT

- Not an accounting system — it tracks asset values and depreciation but does not produce financial statements
- Not a ticketing/helpdesk system — maintenance records are internal, not customer-facing
- Not an HR system — employee records are for asset assignment purposes, not payroll or benefits
- No file storage — the "Documents" and "Attachments" fields store references (paths/URLs), not actual files
- No reporting engine yet — the "Reports" tab in Finance is disabled/placeholder

---

## 2. Architecture

### Deployment Model

```
Browser --> ASP.NET Core 8 (single process)
              |-- /api/*     --> Controllers --> EF Core --> SQL Server
              |-- /*         --> wwwroot/ (static Next.js export)
```

Single-host monorepo with two projects:

| Project | Technology | Role |
|---|---|---|
| `DFile.backend/` | .NET 8, ASP.NET Core, EF Core, SQL Server | API server + static file host |
| `DFile.frontend/` | Next.js 16, React 19, TypeScript 5, Tailwind v4, shadcn/ui | Static export (`output: 'export'`) built to `out/`, copied to `wwwroot/` |

**At runtime, only the .NET process runs.** There is no separate Node.js server. The frontend is pre-built static HTML/JS/CSS served by ASP.NET's `UseStaticFiles()` middleware.

### Middleware Pipeline (Program.cs — exact order)

1. `UseStaticFiles()` — serves wwwroot assets, short-circuits before auth
2. `UseSwagger()` + `UseSwaggerUI()` — development only
3. `UseCors("AllowAll")` — permissive CORS (any origin/method/header)
4. `UseAuthentication()` — JWT bearer validation
5. `UseAuthorization()` — role-based authorization
6. `MapGet("/api/health")` — health check endpoint
7. `MapControllers()` — all API routes
8. `Map("/api/{**rest}")` — explicit 404 for unmatched API paths
9. `MapFallbackToFile("index.html")` — SPA fallback (must be last)

### Frontend Architecture

- **State Management:** TanStack Query for server state (8 hook files, ~55 hooks)
- **Auth:** React Context (`AuthContext`) with JWT stored in `localStorage`
- **API Layer:** Centralized Axios instance with Bearer token interceptor
- **UI:** shadcn/ui primitives (32 components) + domain components (19) + modals (14)
- **Routing:** File-based routing with role-namespaced directories
- **Theming:** `next-themes` with light/dark mode toggle

---

## 3. Data Model

### Entity Relationship Overview

```
Tenant (1) ---------+-- (N) User
                     |-- (N) Asset ---- (1) AssetCategory
                     |-- (N) Room ----- (1) RoomCategory
                     |-- (N) Employee
                     |-- (N) Department
                     |-- (N) Role
                     |-- (N) MaintenanceRecord ---- (1) Asset
                     |-- (N) PurchaseOrder
                     +-- (N) TaskItem ---- (1?) Employee (AssignedTo)
```

**Important:** Almost no EF Core navigation properties or foreign key constraints are defined. Relationships are "soft" — entities store related IDs as plain `string`/`int` fields without database-level referential integrity. The only exception is `Room -> RoomCategory` which has an explicit navigation property.

### Entities (12 tables)

| Entity | Primary Key | Key Fields | Tenant-Scoped |
|---|---|---|---|
| **Tenant** | `int` (auto) | Name, SubscriptionPlan, Status, MaxRooms, MaxPersonnel | No (platform-level) |
| **User** | `int` (auto) | Name, Email, PasswordHash, Role, RoleLabel, TenantId | Yes (nullable for Super Admin) |
| **Asset** | `string` | TagNumber, Desc, CategoryId, Status, Room, Value, PurchasePrice, UsefulLifeYears, CurrentBookValue, MonthlyDepreciation | Yes |
| **AssetCategory** | `string` (GUID) | CategoryName, HandlingType (Fixed/Consumable/Movable), Status | Yes (nullable = global) |
| **Room** | `string` | UnitId, Name, Floor, CategoryId, Status, MaxOccupancy | Yes |
| **RoomCategory** | `string` | Name, SubCategory, Description, BaseRate, MaxOccupancy | Yes |
| **Employee** | `string` | FirstName, LastName, Email, Department, Role, HireDate, Status | Yes |
| **Department** | `string` | Name, Description, Head, Status | Yes |
| **Role** | `string` | Designation, Department, Scope, Status | Yes |
| **MaintenanceRecord** | `string` (GUID) | AssetId, Description, Status, Priority, Type, Frequency, Cost | Yes |
| **PurchaseOrder** | `string` | AssetName, Category, Vendor, PurchasePrice, Status, RequestedBy | Yes |
| **TaskItem** | `string` (GUID) | Title, Description, Priority, Status, AssignedTo, DueDate | Yes |

### Subscription Plans

| Feature | Starter | Basic | Pro |
|---|---|---|---|
| Max Rooms | 20 | 100 | 200 |
| Max Personnel | 10 | 30 | 200 |
| Asset Tracking | Yes | Yes | Yes |
| Depreciation | Yes | Yes | Yes |
| Maintenance Module | No | Yes | Yes |
| Reports Level | Standard | Standard | Able |

### Archive Pattern

Most entities use a soft-delete pattern:
- `Archived` boolean flag (Assets, Rooms, RoomCategories, MaintenanceRecords, PurchaseOrders, TaskItems)
- `Status = "Archived"` string value (Tenants, Departments, Roles, AssetCategories, Employees)
- Some entities use both (`Rooms` has `Archived=true` + `Status="Deactivated"`)

---

## 4. Authentication & Authorization

### JWT Authentication

- **Algorithm:** HMAC-SHA256 (symmetric key from `Configuration["Jwt:Key"]`)
- **Token Lifetime:** 7 days
- **Claims:** `NameIdentifier` (user ID), `Email`, `Role`, `TenantId` (only if user has one)
- **Validation:** `ValidateIssuer=false`, `ValidateAudience=false`, `RequireHttpsMetadata=false`
- **Password Hashing:** BCrypt (`BCrypt.Net.BCrypt`)
- **Storage:** Frontend stores token in `localStorage` as `dfile_token`

### Login Flow

1. User submits email + password to `POST /api/auth/login`
2. Backend finds user by email
3. Backend checks tenant status (must be "Active" if user has a tenant)
4. Backend verifies BCrypt password hash
5. Backend generates JWT with claims and returns `{ token, user }`
6. Frontend stores token + user in `localStorage` and `AuthContext` state
7. On subsequent page loads, frontend reads `localStorage` and validates via `GET /api/auth/me`

### Tenant Isolation

- `TenantAwareController` base class provides `GetCurrentTenantId()` and `IsSuperAdmin()` helpers
- `RequireTenantFilter` (IActionFilter) rejects non-Super Admin requests missing a `TenantId` claim
- Every tenant-aware controller action filters data by `TenantId` from the JWT
- **No EF Core global query filters** — tenant isolation relies entirely on controller-level filtering
- Super Admins bypass tenant filtering and can see all data (or have no tenant)

### RBAC: RoleTemplate vs `Roles` table vs JWT

There are **three different “role” ideas** in the codebase; mixing them up causes apparent conflicts in the database UI:

| Concept | Storage | Used for |
|---|---|---|
| **Module permissions (RBAC)** | `UserRoleAssignments` → `TenantRoles` → `RoleTemplates` → `RolePermissions` | `PermissionService` / `[RequirePermission]` on API actions. This is the source of truth for **can view/create/edit** per module. |
| **Organizational designations** | `Roles` table (`RL-*` ids, `ROL-*` codes, optional `DepartmentId`) | HR-style job titles per department (`/api/Roles`). **Not** used by `PermissionService`. Archiving a row here does **not** revoke API module permissions. |
| **JWT + `Users` row** | `Users.Role` (claim `Role`), `Users.RoleLabel` (display) | `[Authorize(Roles = "...")]` on a **few** endpoints (e.g. register user, list role templates). **Should match** the assigned `RoleTemplate.Name` (and optional `TenantRole.CustomLabel` for display) so tokens stay consistent with RBAC. |

**Migration `SyncUserRoleFromRbacAssignments`** backfills `Users.Role` / `Users.RoleLabel` from the user’s primary `UserRoleAssignment` for tenant users so JWT strings align with templates.

### JWT `Role` claim vs module permissions

- **Module access** (most of `/api/*`): enforced by `PermissionAuthorizationFilter` + `RequirePermission`, using **assignments**, not `Users.RoleLabel`.
- **Super Admin**: bypasses permission checks when `ClaimTypes.Role` is `Super Admin`.
- **Endpoints that use role names only** (not `RequirePermission`): e.g. `POST /api/auth/register` and `GET /api/RoleTemplates/available` require **`Super Admin` or `Admin`** in the JWT. Tenant users with roles **`Finance Manager`** or **`Maintenance Manager`** do **not** receive those claims and **cannot** call those routes by design (only tenant **Admin** and platform Super Admin).

### Role Definitions

| Role | Scope | TenantId | Description |
|---|---|---|---|
| **Super Admin** | Platform | `null` | Manages tenants, onboards organizations |
| **Admin** | Tenant | Required | Full tenant administration — assets, rooms, employees, departments, roles |
| **Finance Manager** | Tenant | Required | Financial oversight — asset values, depreciation, purchase orders (JWT `Role` matches `RoleTemplate` name) |
| **Maintenance Manager** | Tenant | Required | Maintenance records, task management, employee read access (JWT `Role` matches `RoleTemplate` name) |
| **Procurement** | Tenant | Required | Asset registration, allocation, purchase orders, room read access |
| **Employee** | Tenant | Required | Read-only dashboard access |

---

## 5. Role-Based Access & Workflows

### Super Admin

**Dashboard:** `/superadmin/dashboard`
**Namespace:** `/superadmin/*`
**Purpose:** Platform-level management of all tenants

| Page | Functions |
|---|---|
| **Dashboard** | KPI cards (active tenants, total tenants, archived), quick tenant list summary, Create Tenant CTA |
| **Organizations** | Full tenant table with sortable columns, meatball menu (Archive/Restore), archive toggle, ConfirmDialog |
| **Create Tenant** | Registration form: org name, admin name/email/password, subscription plan selector (Starter/Basic/Pro) |

**What Super Admin can do:**
- View all tenants and their statuses
- Create new tenants (+ their initial admin user) in one atomic operation
- Archive/restore tenants (status: Active / Inactive / Archived)
- Register new users via `POST /api/auth/register` (any tenant, any role)
- Access all tenant-aware endpoints (bypasses tenant filter)

**What Super Admin cannot do:**
- No tenant-specific dashboard views (no asset/room/maintenance UI)
- Cannot hard-delete tenants
- Cannot edit tenant details (only status)

---

### Admin (Tenant Administrator)

**Dashboard:** `/tenantadmin/dashboard`
**Namespace:** `/tenantadmin/*`
**Purpose:** Full administration of a single tenant's data

| Page | Functions |
|---|---|
| **Dashboard** | Asset statistics (total, active, maintenance, archived), asset table with details modal |
| **Asset Registration** | Full asset CRUD — add/edit/archive/restore assets, manage asset categories, category handling types |
| **Asset Allocation** | Assign assets to rooms via room selection UI |
| **Asset Depreciation** | View depreciation schedule, current book values, monthly depreciation rates |
| **Room Units** | Room CRUD — add/edit/archive/restore rooms, manage room categories with base rates |
| **Organization** | Employee management (add/edit/archive), role management (add/edit/archive), department management |

**Full backend access to:** Assets, AssetCategories, Rooms, RoomCategories, Employees, Departments, Roles, PurchaseOrders, Maintenance, Tasks

---

### Finance

**Dashboard:** `/financemanager/dashboard`
**Namespace:** `/financemanager/*`
**Purpose:** Financial monitoring and depreciation tracking

| Page | Functions |
|---|---|
| **Finance Overview** | Tabbed view — Overview tab (finance dashboard), Depreciation tab, Reports tab (disabled) |
| **Depreciation** | Dedicated depreciation analysis page with asset details |

**Backend access to:** Assets (read + financial updates), AssetCategories (read + create/edit), PurchaseOrders (full CRUD)

**Notable:** Finance role can update asset financial fields (PurchasePrice, Value, UsefulLifeYears, CurrentBookValue) via the dedicated `/api/assets/{id}/financial` endpoint.

---

### Maintenance

**Dashboard:** `/maintenancemanager/dashboard`
**Namespace:** `/maintenancemanager/*`
**Purpose:** Maintenance operations and task tracking

| Page | Functions |
|---|---|
| **Dashboard** | Maintenance overview — active records, status distribution |
| **Maintenance & Repair** | Full maintenance record CRUD, create/edit/archive/restore, replacement acquisition flow |
| **Task Management** | Task CRUD with inline create dialog, priority/status filters, assign to employees |

**Backend access to:** MaintenanceRecords (full CRUD), Tasks (full CRUD), Employees (read-only), Assets (read + standard updates)

**Notable:** The acquisition modal allows creating a purchase order when an asset needs replacement during maintenance.

---

### Procurement

**Dashboard:** `/tenantadmin/dashboard` (shared namespace with Admin)
**Namespace:** `/tenantadmin/*`
**Purpose:** Asset procurement and allocation

| Page | Functions |
|---|---|
| **Dashboard** | Procurement-specific stats (total assets, unallocated count) |
| **Asset Registration** | Asset and category management |
| **Asset Allocation** | Assign assets to rooms |
| **Asset Depreciation** | View depreciation data |

**Backend access to:** Assets (full CRUD minus financial-only updates), AssetCategories (read + create/edit), PurchaseOrders (full CRUD), Rooms (read-only + stats)

**Notable:** Procurement uses the same tenantadmin namespace and page components as Admin and Employee, but with nav items filtered by `allowedRoles`.

---

### Employee

**Dashboard:** `/tenantadmin/dashboard` (shared namespace)
**Namespace:** `/tenantadmin/*`
**Purpose:** Read-only access to basic dashboard

| Page | Functions |
|---|---|
| **Dashboard** | Static welcome message ("Welcome to DFile") |

**Backend access:** Employee role is not listed on any controller's `[Authorize]` attribute. The Employee role effectively has no backend API access beyond `GET /api/auth/me`.

**Frontend guards:** Inventory, Allocation, Depreciation, Rooms, and Organization pages all return `null` for Employee role.

---

## 6. Module-by-Module Functional Breakdown

### 6.1 Asset Management Module

**Entities:** Asset, AssetCategory
**Controllers:** AssetsController (9 endpoints), AssetCategoriesController (6 endpoints)
**Frontend:** Inventory page, Registration view, Add Asset modal, Manage Categories modal, Asset Details modal

**Workflow:**
1. **Category Setup** — Admin/Finance create asset categories (IT Equipment, Furniture, etc.) with handling types (Fixed, Consumable, Movable)
2. **Asset Registration** — Create asset with tag number, description, category, manufacturer, model, serial number, purchase details
3. **Auto-Depreciation** — On creation, system calculates `MonthlyDepreciation = PurchasePrice / (UsefulLifeYears x 12)` and sets `CurrentBookValue = PurchasePrice`
4. **Tag Uniqueness** — Tag numbers are unique per tenant (enforced at DB level with composite index)
5. **Financial Updates** — Finance/Admin can update financial fields separately via dedicated endpoint
6. **Archive/Restore** — Soft-delete with status tracking

**Asset Categories:**
- Global categories (TenantId=null) are visible to all tenants — seeded with 15 defaults
- Tenant-specific categories can be created
- Categories track handling type: Fixed (immovable), Consumable (expendable), Movable (portable)
- Archive/restore only — no hard delete

### 6.2 Room/Location Module

**Entities:** Room, RoomCategory
**Controllers:** RoomsController (8 endpoints), RoomCategoriesController (7 endpoints)
**Frontend:** Rooms page, Room List view, Room modal, Manage Room Categories modal

**Workflow:**
1. **Category Setup** — Create room categories (Office, Conference, Warehouse, etc.) with base rates and max occupancy
2. **Room Creation** — Create rooms with unit ID, name, floor, category, max occupancy
3. **Status Tracking** — Rooms have statuses: Available, Occupied, Maintenance
4. **Stats** — Dashboard endpoint returns counts by status (Total, Occupied, Available, Maintenance)
5. **Search/Filter** — Rooms support server-side text search and multi-status filtering

### 6.3 Asset Allocation Module

**Frontend:** Allocation page, Asset Allocation view
**Backend:** `PUT /api/assets/allocate/{id}` (AllocateAssetDto)

**Workflow:**
1. View unallocated assets (assets with no room assigned)
2. Select an asset and assign it to a room
3. Room field on asset is updated to the room ID
4. No occupancy validation — system does not check if room is at max capacity

### 6.4 Depreciation Module

**Frontend:** Depreciation view (shared by tenantadmin + financemanager), Asset Details modal
**Backend:** Asset financial fields (auto-calculated on create/update)

**Calculation:** Straight-line depreciation
- `MonthlyDepreciation = PurchasePrice / (UsefulLifeYears x 12)`
- `CurrentBookValue` = PurchasePrice minus accumulated depreciation
- Seed data pre-calculates book values based on elapsed months since purchase

**Frontend** displays depreciation schedules and current book values per asset.

### 6.5 Maintenance Module

**Entities:** MaintenanceRecord
**Controller:** MaintenanceController (7 endpoints)
**Frontend:** Maintenance dashboard, Maintenance operations, Create/edit maintenance modal, Maintenance details modal, Acquisition modal

**Workflow:**
1. **Create Record** — Linked to a specific asset (validates asset exists + same tenant), set priority (Low/Medium/High), type (Preventive/Corrective/Upgrade/Inspection), frequency (One-time/Daily/Weekly/Monthly/Yearly)
2. **Status Tracking** — Pending -> In Progress -> Completed (also Scheduled)
3. **Cost Tracking** — Optional cost field per record
4. **Date Tracking** — DateReported (auto), StartDate, EndDate
5. **Replacement Flow** — If maintenance determines asset needs replacement, the acquisition modal creates a purchase order
6. **Archive/Restore** — Soft-delete

### 6.6 Task Management Module

**Entity:** TaskItem
**Controller:** TasksController (7 endpoints)
**Frontend:** Tasks page (self-contained, 268 lines)

**Workflow:**
1. **Create Task** — Title, description, priority (Low/Medium/High), assigned employee, due date
2. **Status Tracking** — Pending -> In Progress -> Completed
3. **Assignment** — Tasks can be assigned to employees (stores employee ID)
4. **Inline UI** — Tasks page has create dialog, search, priority/status filters, archive toggle all in one page
5. **Archive/Restore** — Soft-delete

### 6.7 Purchase Order Module

**Entity:** PurchaseOrder
**Controller:** PurchaseOrdersController (6 endpoints)
**Frontend:** Triggered from maintenance acquisition flow; also accessible from order details modal

**Workflow:**
1. **Create PO** — Asset name, category, vendor, manufacturer, model, serial number, purchase price, useful life
2. **Status Flow** — Pending -> Approved -> Delivered -> Cancelled (no validation on transitions)
3. **Asset Link** — On delivery, PO can be linked to a created asset via AssetId field
4. **Archive/Restore** — Soft-delete, no hard delete

### 6.8 Organization Module

**Entities:** Employee, Department, Role
**Controllers:** EmployeesController (7 endpoints), DepartmentsController (6 endpoints), RolesController (6 endpoints)
**Frontend:** Organization page, Roles dashboard, Add Employee modal, Employee Details modal, Create Role modal

**Workflow:**
1. **Departments** — Create departments (IT, Finance, Operations, etc.) with head assignment
2. **Roles** — Organizational roles (not auth roles) with designation, department, scope
3. **Employees** — Full employee records with name, email, contact, department, role, hire date
4. **Archive/Restore** — All three entities support soft-delete

**Note:** These are *organizational* structures, separate from the 6 authentication roles (Super Admin, Admin, etc.). An employee's `Role` field is an organizational designation, not their system login role.

### 6.9 Tenant Management Module (Super Admin Only)

**Entity:** Tenant
**Controller:** TenantsController (4 endpoints)
**Frontend:** Organizations page (tenant list), Create Tenant page, Create Tenant Admin modal, Tenant Details modal

**Workflow:**
1. **Onboarding** — Super Admin creates a tenant + initial admin user in one atomic operation
2. **Plan Selection** — Starter/Basic/Pro with different limits
3. **Status Management** — Active / Inactive / Archived (via status update endpoint)
4. **No Edit** — Tenant name/plan cannot be changed after creation (only status)

---

## 7. API Endpoint Catalog

### Summary

| Controller | Route Prefix | Base Class | Authorized Roles | Endpoints | Tenant Filtered | Hard Delete |
|---|---|---|---|---|---|---|
| **Assets** | `api/assets` | TenantAware | Admin, Finance, Maintenance, Procurement, Super Admin | 9 | Yes | Yes |
| **AssetCategories** | `api/assetcategories` | TenantAware | Admin, Finance, Procurement, Super Admin | 6 | Yes (+global) | No |
| **Auth** | `api/auth` | ControllerBase | Mixed (login=public) | 3 | No | No |
| **Departments** | `api/departments` | TenantAware | Admin, Super Admin | 6 | Yes | No |
| **Employees** | `api/employees` | TenantAware | Admin, Maintenance, Super Admin | 7 | Yes | Yes |
| **Maintenance** | `api/maintenance` | TenantAware | Admin, Maintenance, Super Admin | 7 | Yes | Yes |
| **PurchaseOrders** | `api/purchaseorders` | TenantAware | Admin, Finance, Procurement, Super Admin | 6 | Yes | No |
| **Roles** | `api/roles` | TenantAware | Admin, Super Admin | 6 | Yes | No |
| **RoomCategories** | `api/roomcategories` | TenantAware | Admin, Super Admin | 7 | Yes | Yes |
| **Rooms** | `api/rooms` | TenantAware | Admin, Procurement, Super Admin | 8 | Yes | Yes |
| **Tasks** | `api/tasks` | TenantAware | Admin, Maintenance, Super Admin | 7 | Yes | Yes |
| **Tenants** | `api/tenants` | ControllerBase | Super Admin | 4 | No | No |

**Totals: 13 controllers, 76 endpoints**

### Manual API QA

With the API running (`dotnet run` in `DFile.backend`, default `http://localhost:5090`), use **Swagger UI** at `/swagger` (Development) or call `GET /api/health` unauthenticated. Exercise tenant flows with seeded accounts from [Seed Data](#10-seed-data--initial-state).

### Common Endpoint Patterns

Every tenant-aware controller follows this pattern:
- `GET /api/{resource}` — List (with `?showArchived` filter)
- `GET /api/{resource}/{id}` — Get by ID
- `POST /api/{resource}` — Create
- `PUT /api/{resource}/{id}` — Update
- `PUT /api/{resource}/archive/{id}` — Soft archive
- `PUT /api/{resource}/restore/{id}` — Soft restore
- `DELETE /api/{resource}/{id}` — Hard delete (where supported)

### Detailed Endpoint List

#### Assets (9 endpoints)
| Verb | Route | Roles | Description |
|---|---|---|---|
| GET | `/api/assets` | Class-level | List assets (?showArchived) |
| GET | `/api/assets/{id}` | Class-level | Get single asset |
| POST | `/api/assets` | Class-level | Create asset (auto-calculates depreciation) |
| PUT | `/api/assets/{id}` | Class-level | Update asset (financial fields restricted to Admin/Finance/Super Admin) |
| PUT | `/api/assets/{id}/financial` | Admin, Finance, Super Admin | Update financial fields only |
| PUT | `/api/assets/allocate/{id}` | Class-level | Allocate asset to room |
| PUT | `/api/assets/archive/{id}` | Admin, Super Admin | Archive asset |
| PUT | `/api/assets/restore/{id}` | Admin, Super Admin | Restore asset |
| DELETE | `/api/assets/{id}` | Admin, Super Admin | Hard delete asset |

#### Auth (3 endpoints)
| Verb | Route | Roles | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login (returns JWT + user) |
| GET | `/api/auth/me` | Any authenticated | Get current user |
| POST | `/api/auth/register` | Super Admin, Admin | Register new user |

#### Maintenance (7 endpoints)
| Verb | Route | Roles | Description |
|---|---|---|---|
| GET | `/api/maintenance` | Class-level | List records (?showArchived) |
| GET | `/api/maintenance/{id}` | Class-level | Get record by ID |
| POST | `/api/maintenance` | Class-level | Create record (validates asset ownership) |
| PUT | `/api/maintenance/{id}` | Class-level | Update record |
| PUT | `/api/maintenance/archive/{id}` | Class-level | Archive record |
| PUT | `/api/maintenance/restore/{id}` | Class-level | Restore record |
| DELETE | `/api/maintenance/{id}` | Class-level | Hard delete record |

#### Tenants (4 endpoints)
| Verb | Route | Roles | Description |
|---|---|---|---|
| POST | `/api/tenants` | Super Admin | Create tenant + admin user |
| GET | `/api/tenants` | Super Admin | List all tenants |
| GET | `/api/tenants/{id}` | Super Admin | Get tenant by ID |
| PUT | `/api/tenants/{id}/status` | Super Admin | Update tenant status (Active/Inactive/Archived) |

---

## 8. Frontend Route Map

### Routes by Namespace

| Route | Page | Role Access | Description |
|---|---|---|---|
| `/` | Home | Any | Redirect: authenticated -> role dashboard, unauthenticated -> `/login` |
| `/login` | Login | Public | Email + password login form |
| `/forbidden` | 403 | Any | Access denied page |
| `/error` | 500 | Any | Error page |
| **Super Admin** | | | |
| `/superadmin/dashboard` | SuperAdminDashboard | Super Admin | Tenant KPIs + summary list |
| `/superadmin/organizations` | OrganizationsPage | Super Admin | Tenant list with CRUD |
| `/superadmin/create-tenant` | CreateTenantPage | Super Admin | Tenant + admin registration form |
| **Tenant Admin** | | | |
| `/tenantadmin/dashboard` | TenantAdminDashboardPage | Admin, Procurement, Employee | Role-branched dashboard |
| `/tenantadmin/inventory` | InventoryPage | Admin, Procurement | Asset + category CRUD |
| `/tenantadmin/allocation` | AllocationPage | Admin, Procurement | Asset -> room assignment |
| `/tenantadmin/depreciation` | DepreciationPage | Admin, Procurement | Depreciation view |
| `/tenantadmin/rooms` | RoomsPage | Admin | Room + room category CRUD |
| `/tenantadmin/organization` | OrganizationPage | Admin | Employee, role, department CRUD |
| **Finance Manager** | | | |
| `/financemanager/dashboard` | FinanceManagerDashboardPage | Finance | Tabbed: overview, depreciation, reports |
| `/financemanager/depreciation` | DepreciationPage | Finance | Dedicated depreciation page |
| **Maintenance Manager** | | | |
| `/maintenancemanager/dashboard` | MaintenanceManagerDashboardPage | Maintenance | Maintenance overview |
| `/maintenancemanager/maintenance` | MaintenancePage | Maintenance | Maintenance record CRUD + acquisition |
| `/maintenancemanager/tasks` | TasksPage | Maintenance | Task CRUD with inline UI |

### Navigation Structure

```
Super Admin (/superadmin)
+-- Overview (dashboard)
+-- Organizations (tenant list)
+-- Create Tenant (registration form)

Tenant Admin (/tenantadmin)
+-- Asset Management
|   +-- Dashboard
|   +-- Asset Registration [Admin, Procurement]
|   +-- Asset Allocation [Admin, Procurement]
|   +-- Asset Depreciation [Admin, Procurement]
+-- Administration
    +-- Room Units [Admin only]
    +-- Organization [Admin only]

Finance Manager (/financemanager)
+-- Finance Overview
+-- Depreciation

Maintenance Manager (/maintenancemanager)
+-- Dashboard
+-- Maintenance & Repair
+-- Task Management
```

---

## 9. Current System Workflow (End-to-End)

### Workflow 1: New Organization Onboarding

```
Super Admin logs in
  -> Navigates to Create Tenant
  -> Fills: Organization name, Admin name/email/password, Plan (Starter/Basic/Pro)
  -> Submits -> POST /api/tenants
  -> Backend creates Tenant + Admin User atomically
  -> New tenant appears in Organizations list
  -> Tenant Admin can now log in with provided credentials
```

### Workflow 2: Asset Lifecycle (Admin Perspective)

```
Admin logs in -> /tenantadmin/dashboard
  -> Navigates to Asset Registration
  -> [Optional] Creates asset categories -> POST /api/assetcategories
  -> Creates new asset -> POST /api/assets
      (System auto-calculates depreciation)
  -> Asset appears in dashboard + registration list
  -> Navigates to Asset Allocation
  -> Assigns asset to a room -> PUT /api/assets/allocate/{id}
  -> Over time, depreciation view shows declining book value
  -> When asset is no longer needed -> Archive -> PUT /api/assets/archive/{id}
```

### Workflow 3: Room Setup (Admin Perspective)

```
Admin logs in -> /tenantadmin/rooms
  -> Creates room categories (Office, Conference, etc.) -> POST /api/roomcategories
  -> Creates rooms with unit IDs, floors, max occupancy -> POST /api/rooms
  -> Rooms become available for asset allocation
  -> Room stats show Available/Occupied/Maintenance counts
```

### Workflow 4: Maintenance Cycle

```
Maintenance Manager logs in -> /maintenancemanager/dashboard
  -> Views maintenance overview (active records, status distribution)
  -> Navigates to Maintenance & Repair
  -> Creates maintenance record for an asset -> POST /api/maintenance
      (Selects asset, sets priority/type/frequency)
  -> Updates status: Pending -> In Progress -> Completed
  -> If asset needs replacement:
      -> Opens acquisition modal
      -> Creates purchase order -> POST /api/purchaseorders
  -> Navigates to Task Management
  -> Creates tasks for maintenance team -> POST /api/tasks
  -> Assigns tasks to employees, tracks completion
```

### Workflow 5: Financial Monitoring (Finance Perspective)

```
Finance Manager logs in -> /financemanager/dashboard
  -> Overview tab: Financial dashboard with asset value summaries
  -> Depreciation tab: Detailed depreciation schedules per asset
  -> Can update asset financial fields -> PUT /api/assets/{id}/financial
  -> Can view/manage purchase orders
  -> Reports tab: (Currently disabled/placeholder)
```

### Workflow 6: Procurement Flow

```
Procurement logs in -> /tenantadmin/dashboard
  -> Views procurement stats (total assets, unallocated)
  -> Can register new assets -> POST /api/assets
  -> Can allocate assets to rooms -> PUT /api/assets/allocate/{id}
  -> Can manage purchase orders -> POST/PUT /api/purchaseorders
  -> Can view depreciation data (read-only view)
```

### Workflow 7: Employee Experience

```
Employee logs in -> /tenantadmin/dashboard
  -> Sees static welcome message
  -> No navigation items beyond Dashboard
  -> No API access to any resource endpoints
  -> Read-only presence in the system
```

---

## 10. Seed Data & Initial State

### Seeded Tenants (3)

| Tenant | Plan | Status | Rooms | Personnel Limit |
|---|---|---|---|---|
| Alpha Holdings | Pro | Active | 10 seeded | 200 |
| Beta Industries | Basic | Active | 0 | 30 |
| Gamma Logistics | Starter | Active | 0 | 10 |

### Seeded Users (10)

| Email | Role | Tenant |
|---|---|---|
| `superadmin@dfile.com` | Super Admin | None |
| `admin@superadmin.com` | Super Admin | None |
| `admin@alpha.com` | Admin | Alpha Holdings |
| `finance@alpha.com` | Finance | Alpha Holdings |
| `maintenance@alpha.com` | Maintenance | Alpha Holdings |
| `employee@alpha.com` | Employee | Alpha Holdings |
| `admin@beta.com` | Admin | Beta Industries |
| `finance@beta.com` | Finance | Beta Industries |
| `maintenance@beta.com` | Maintenance | Beta Industries |
| `admin@gamma.com` | Admin | Gamma Logistics |

### Seeded Data Volumes

| Entity | Count | Distribution |
|---|---|---|
| Asset Categories | 15 | Global (all tenants) |
| Room Categories | 5 | Alpha only |
| Rooms | 10 | Alpha only |
| Departments | 5 | Alpha only |
| Assets | 120 | Across all 3 tenants, ~10% archived |
| Maintenance Records | 80 | Alpha + Beta only |

### Default Passwords

All seeded users use the same BCrypt-hashed password (set in `DbInitializer.cs`).

---

## 11. Known Gaps & Observations

### Data Model Issues

| Issue | Impact | Severity |
|---|---|---|
| Almost no EF Core FK relationships defined | No referential integrity, no cascade deletes, manual joins required | High |
| `PurchaseOrder.PurchaseDate` and `CreatedAt` stored as `string` | Sorting/filtering issues, cannot use SQL date functions | Medium |
| `Asset.Cat` field appears unused (legacy) alongside `CategoryId` | Dead column in database | Low |
| No `Procurement` role user seeded | Cannot test Procurement role out-of-box | Medium |
| `TenantId` nullable on all models without global query filter | Tenant isolation relies entirely on controller logic — one missed filter = data leak | High |
| `Employee` model has no `[Key]` attribute | Works by EF convention but inconsistent | Low |

### Authorization Gaps

| Issue | Impact |
|---|---|
| Employee role has no API access to any resource controller | Employee can log in but has zero backend utility beyond `/api/auth/me` |
| No Procurement user seeded | Cannot verify Procurement workflows without manual user creation |
| Maintenance role has full CRUD on maintenance records and tasks (no status-based restrictions) | No workflow enforcement (cannot prevent re-opening completed records) |
| No status transition validation on PurchaseOrders | Any status value accepted — can go from "Delivered" back to "Pending" |
| `RequireTenantFilter` is a fail-closed guard but has no unit tests | Critical security filter without test coverage |

### Frontend Gaps

| Issue | Impact |
|---|---|
| Reports tab in Finance dashboard is disabled/placeholder | Feature not implemented |
| No purchase order management page (only via maintenance acquisition modal) | Incomplete procurement workflow UI |
| `use-tenants.ts` defines a local `Tenant` interface duplicating `types/asset.ts` | Type definition drift risk |
| No dedicated Procurement-specific UI | Procurement uses the same tenantadmin pages with nav filtering |
| No notification system (bell icon in header is decorative) | No real-time alerts for maintenance due dates, task assignments |
| No user management page for tenant admins | Admin must create users via API or Super Admin help |
| `Tenant` type exported from both `types/asset.ts` and `hooks/use-tenants.ts` | Potential for interface mismatch |

### Missing Features

| Feature | Current State |
|---|---|
| **Reporting/Analytics** | No report generation, export, or analytics beyond dashboard stat cards |
| **Audit Trail** | No logging of who changed what and when |
| **File Uploads** | Documents/Attachments fields exist but no upload mechanism |
| **Notifications** | No email, in-app, or push notifications |
| **User Management (Tenant-Level)** | No UI for tenant admins to manage their own users |
| **Tenant Settings** | No tenant configuration page (name, contact, subscription changes) |
| **Asset Transfer** | No workflow for transferring assets between rooms or tenants |
| **Bulk Operations** | No bulk import/export, bulk archive, bulk allocation |
| **Search (Global)** | Only rooms have server-side search; other entities filter client-side only |
| **Pagination** | All list endpoints return full datasets — no server-side pagination |
| **Password Reset** | No forgot-password or password change flow |
| **QR Codes** | QR code modal component exists but generation/scanning workflow is unclear |

