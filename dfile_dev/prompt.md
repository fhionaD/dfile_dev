# DFile — Full System Functional Audit & Architecture Document

---

## EXECUTIVE SUMMARY

DFile is a **multi-tenant SaaS Fixed Asset Management System (FAMS)**. Its core purpose is to allow organizations (tenants) to register, track, allocate, depreciate, and maintain physical assets across locations (rooms), personnel (employees and organizations), and departments. A Super Admin operates at the platform level, managing tenants and subscriptions. Each tenant has its own scoped data, users, and configuration.

**Primary business goals:**
- Track physical asset inventory with full financial metadata
- Calculate and report straight-line depreciation
- Manage maintenance schedules and work orders
- Allocate assets to physical rooms/locations
- Support multi-tenant subscription billing tiers

**High-level architecture:**
```
Browser → /api/*          → ASP.NET Core 8 Controllers → SQL Server (MonsterASP.NET)
Browser → /* (any route)  → wwwroot/index.html (Next.js static export SPA)
```
A single Kestrel/IIS process handles both the REST API and the compiled SPA. There is no separate Node.js server in production.

---

## PHASE 1 — SYSTEM OVERVIEW

| Dimension | Detail |
|---|---|
| System type | Multi-tenant SaaS Fixed Asset Management System |
| Backend | ASP.NET Core 8 Web API, EF Core 8, SQL Server |
| Frontend | Next.js 16 (static export), React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui |
| Deployment | Single host — backend serves both `/api/*` and static frontend from `wwwroot/` |
| Auth | JWT (HMAC-SHA256), 7-day expiry, BCrypt password hashing |
| Tenancy | Multi-tenant — data scoped by `TenantId` (integer FK) on every entity |
| Roles | 6 roles: Super Admin, Admin, Finance, Maintenance, Procurement, Employee |
| DB | Single SQL Server database. No per-tenant database isolation |

---

## PHASE 2 — ROLE & PERMISSION MATRIX

### Role Definitions

| Role | Scope | TenantId | Description |
|---|---|---|---|
| `Super Admin` | Platform | `null` | Full cross-tenant access. Manages tenants, sees all data |
| `Admin` | Tenant | Required | Full access within their tenant |
| `Finance` | Tenant | Required | Assets, categories, depreciation |
| `Maintenance` | Tenant | Required | Maintenance records, tasks, assets (read) |
| `Procurement` | Tenant | Required | Purchase orders. Uses tenantadmin namespace |
| `Employee` | Tenant | Required | View-only; shares tenantadmin namespace |

### Frontend Route Access

| Role | Namespace | Dashboard Path | Nav Items |
|---|---|---|---|
| Super Admin | `/superadmin` | `/superadmin/dashboard` | Overview, Create Tenant |
| Admin | `/tenantadmin` | `/tenantadmin/dashboard` | Dashboard, Asset Registration, Asset Allocation, Asset Depreciation, Room Units, Organization |
| Finance | `/financemanager` | `/financemanager/dashboard` | Finance Overview, Depreciation |
| Maintenance | `/maintenancemanager` | `/maintenancemanager/dashboard` | Dashboard, Maintenance & Repair, Task Management |
| Procurement | `/tenantadmin` | `/tenantadmin/dashboard` | (same as Admin namespace) |
| Employee | `/tenantadmin` | `/tenantadmin/dashboard` | (same as Admin namespace) |

### Backend Endpoint Access (by role)

| Controller | Allowed Roles |
|---|---|
| `AssetsController` | Admin, Finance, Maintenance, Procurement, Super Admin |
| `AssetCategoriesController` | Admin, Finance, Super Admin |
| `MaintenanceController` | Admin, Maintenance, Super Admin |
| `TasksController` | Admin, Maintenance, Super Admin |
| `RoomsController` | Admin, Super Admin |
| `RoomCategoriesController` | Admin, Super Admin |
| `EmployeesController` | Admin, Super Admin |
| `TenantsController` | Super Admin only |
| `AuthController` (login, me) | Unauthenticated |
| `AuthController` (register) | Super Admin, Admin |

### Tenant Isolation Rule (enforced in every controller)

- Non-Super Admin users: all queries filter by `TenantId == user.TenantId`
- Super Admin: no filter — sees all records across all tenants
- Cross-tenant access returns `404 NotFound` (not 403), preventing tenant enumeration

---

## PHASE 3 — FEATURE BREAKDOWN BY MODULE

### Module 1: Authentication & Users

**Purpose:** Login, session management, user registration.

**Database entity:** `Users`

**Operations:**
- `POST /api/auth/login` — Validates email + password, checks tenant active status, returns JWT + user object
- `GET /api/auth/me` — Validates current token, returns refreshed user object
- `POST /api/auth/register` — Creates new user. Super Admin can assign to any tenant. Admin can only add to own tenant.

**Business rules:**
- Login blocked if tenant status is not `"Active"` (message: "Your organization's account is inactive")
- Passwords hashed with BCrypt
- JWT contains: `NameIdentifier (userId)`, `Email`, `Role`, `TenantId (if set)`
- JWT expiry: 7 days
- `PasswordHash` field annotated `[JsonIgnore]` — never serialized to API responses
- User roles (string values, not enum): `"Admin"`, `"Maintenance"`, `"Finance"`, `"Procurement"`, `"Employee"`, `"Super Admin"`

**Relationships:** `User.TenantId → Tenant.Id` (nullable; null = Super Admin)

---

### Module 2: Tenant Management

**Purpose:** Super Admin creates and manages organizations (tenants).

**Database entity:** `Tenants`

**Operations:**
- `POST /api/tenants` — Creates tenant + initial admin user atomically
- `GET /api/tenants` — Lists all tenants
- `GET /api/tenants/{id}` — Get single tenant
- `PUT /api/tenants/{id}/status` — Update tenant status

**Business rules:**
- Tenant name must be unique
- Admin email must be unique across all users
- On create: admin user always created with `Role = "Admin"`, password BCrypt-hashed
- Status transitions: `Active → Inactive → Archived` (and reverse). Only values: `"Active"`, `"Inactive"`, `"Archived"`
- Status is enforced at login — inactive/archived tenant users cannot login
- `Tenant.Create()` factory method assigns plan limits automatically

**Subscription plans and their limits:**

| Plan | MaxRooms | MaxPersonnel | MaintenanceModule | ReportsLevel |
|---|---|---|---|---|
| Starter | 20 | 10 | false | Standard |
| Basic | 100 | 30 | true | Standard |
| Pro | 200 | 200 | true | Able |

All plans have `AssetTracking = true` and `Depreciation = true`.

---

### Module 3: Assets

**Purpose:** Core asset registry. Track all physical assets with full financial and physical metadata.

**Database entity:** `Assets`

**Operations:**
- `GET /api/assets?showArchived=` — List (filtered by tenant, optional archive filter)
- `GET /api/assets/{id}` — Single asset with category name + handling type joined
- `POST /api/assets` — Create with auto-calculated depreciation values
- `PUT /api/assets/{id}` — Full update (caller supplies `CurrentBookValue` and `MonthlyDepreciation`)
- `PUT /api/assets/allocate/{id}` — Assign/change asset's room
- `PUT /api/assets/archive/{id}` — Sets `Status="Archived"` + `Archived=true`
- `PUT /api/assets/restore/{id}` — Sets `Status="Active"` + `Archived=false`
- `DELETE /api/assets/{id}` — Hard delete

**Filtering logic:**
- `showArchived=true` → only archived (`Archived=true` OR `Status="Archived"`)
- `showArchived=false` → only active (`Archived=false` AND `Status!="Archived"`)
- `showArchived` not provided → all assets, no filter

**Business rules:**
- `CategoryId` is **required** — cannot create asset without a valid category
- `TagNumber` must be unique per `TenantId` (DB unique index `IX_Assets_TenantId_TagNumber`, filter: `[TagNumber] IS NOT NULL`)
- On create: `CurrentBookValue = PurchasePrice`, `MonthlyDepreciation = PurchasePrice / (UsefulLifeYears * 12)` (rounded to 2 decimals). If `UsefulLifeYears = 0`, `MonthlyDepreciation = 0`
- On update: caller is responsible for providing updated `CurrentBookValue` and `MonthlyDepreciation`
- Response DTO enriches asset with `CategoryName` and `HandlingType` from joined category

**Archive behavior:**
- Dual-field: `Archived` (bool) + `Status` (string). Both set on archive/restore.
- Archive does NOT delete; soft-delete pattern.

**Asset statuses (string):** `"Active"`, `"Archived"`, `"Under Maintenance"`, `"Disposed"`, `"In Storage"`, `"In Transit"`, `"Assigned"` (no controller-level validation of valid values)

---

### Module 4: Asset Categories

**Purpose:** Define types/groups of assets with financial handling classification.

**Database entity:** `AssetCategories`

**Operations:**
- `GET /api/assetcategories?showArchived=` — List with asset count per category
- `GET /api/assetcategories/{id}` — Single with item count
- `POST /api/assetcategories` — Create
- `PUT /api/assetcategories/{id}` — Update (name, handling type, description only)
- `PUT /api/assetcategories/archive/{id}` — Sets `Status="Archived"`
- `PUT /api/assetcategories/restore/{id}` — Sets `Status="Active"`

**Filtering/scoping:**
- Non-Super Admin users see: categories where `TenantId IS NULL` (global) OR `TenantId = user.TenantId`
- Super Admin sees: all categories regardless of TenantId

**Business rules:**
- `TenantId = null` = platform-wide global category visible to all tenants
- `TenantId = X` = private to that tenant only
- Status is string-based: `"Active"` or `"Archived"` (no `Archived` bool field — status string only)
- `Items` count in response is calculated live from `Assets` table with tenant filter applied
- `HandlingType` enum stored as `int` in DB (default 0 = Fixed)

**HandlingType enum:**
```
Fixed = 0       (permanent, non-movable assets — furniture, building fixtures)
Consumable = 1  (single-use or depleting assets)
Movable = 2     (portable assets — laptops, vehicles)
```

---

### Module 5: Maintenance Records

**Purpose:** Track maintenance jobs, repairs, inspections, and upgrades on assets.

**Database entity:** `MaintenanceRecords`

**Operations:**
- `GET /api/maintenance?showArchived=` — List ordered by `CreatedAt` descending
- `GET /api/maintenance/{id}` — Single record
- `POST /api/maintenance` — Create (`DateReported` and `CreatedAt` auto-set to UTC now)
- `PUT /api/maintenance/{id}` — Update
- `PUT /api/maintenance/archive/{id}` — Sets `Archived=true`
- `PUT /api/maintenance/restore/{id}` — Sets `Archived=false`
- `DELETE /api/maintenance/{id}` — Hard delete

**Business rules:**
- `AssetId` is required (FK string to `Assets.Id` — not enforced at DB level, only DTO validation)
- Status (string, not validated in controller): `"Pending"`, `"In Progress"`, `"Completed"`, `"Scheduled"`
- Priority: `"Low"`, `"Medium"`, `"High"`
- Type: `"Preventive"`, `"Corrective"`, `"Upgrade"`, `"Inspection"`
- Frequency: `"One-time"`, `"Daily"`, `"Weekly"`, `"Monthly"`, `"Yearly"` (nullable)
- `Attachments` stored as comma-separated string
- No asset status update on maintenance record status change (no coupling)

---

### Module 6: Tasks

**Purpose:** Lightweight task/work-order management for the maintenance team.

**Database entity:** `Tasks` (model: `TaskItem`)

**Operations:**
- `GET /api/tasks?showArchived=` — List ordered by `CreatedAt` descending
- `GET /api/tasks/{id}` — Single
- `POST /api/tasks` — Create
- `PUT /api/tasks/{id}` — Full update
- `PUT /api/tasks/archive/{id}` — Sets `Archived=true`
- `PUT /api/tasks/restore/{id}` — Sets `Archived=false`
- `DELETE /api/tasks/{id}` — Hard delete

**Business rules:**
- `AssignedTo` is a free-string (typically an employee ID, but no FK constraint)
- Status: `"Pending"`, `"In Progress"`, `"Completed"`, `"Cancelled"` (string, not validated)
- Priority: `"Low"`, `"Medium"`, `"High"` (string, not validated)
- `CreatedAt` auto-set server-side on create

---

### Module 7: Rooms

**Purpose:** Manage physical locations/rooms for asset allocation tracking.

**Database entity:** `Rooms`

**Operations:**
- `GET /api/rooms?search=&categoryId=&status=` — List with filtering + search. Returns with `RoomCategory` navigation property included
- `GET /api/rooms/{id}` — Single with `RoomCategory` included
- `POST /api/rooms` — Create
- `PUT /api/rooms/{id}` — Full update
- `PUT /api/rooms/archive/{id}` — Sets `Archived=true`, `Status="Deactivated"`
- `PUT /api/rooms/restore/{id}` — Sets `Archived=false`, `Status="Available"`
- `DELETE /api/rooms/{id}` — Hard delete

**Filtering:**
- `search` — case-insensitive match on `Name`, `UnitId`, or `Floor`
- `categoryId` — filter by `CategoryId`
- `status` — supports comma-separated multi-value (e.g., `"Available,Occupied"`)

**Room statuses:** `"Available"`, `"Occupied"`, `"Maintenance"`, `"Deactivated"`

---

### Module 8: Room Categories

**Purpose:** Classify rooms by type/purpose with rate and capacity defaults.

**Database entity:** `RoomCategories`

**Operations:**
- `GET /api/roomcategories?includeArchived=&search=` — List with optional search
- `GET /api/roomcategories/{id}` — Single
- `POST /api/roomcategories` — Create
- `PUT /api/roomcategories/{id}` — Update
- `PUT /api/roomcategories/archive/{id}` — Sets `Archived=true`, `Status="Archived"`
- `PUT /api/roomcategories/restore/{id}` — Sets `Archived=false`, `Status="Active"`
- `DELETE /api/roomcategories/{id}` — Hard delete

---

### Module 9: Employees

**Purpose:** Manage personnel/HR records within a tenant.

**Database entity:** `Employees`

**Operations:**
- `GET /api/employees?showArchived=` — List (default: active only)
- `GET /api/employees/{id}` — Single
- `POST /api/employees` — Create (ID auto-generated as `EMP-{yyyyMMddHHmmssfff}`)
- `PUT /api/employees/{id}` — Full update including status
- `PUT /api/employees/archive/{id}` — Sets `Status="Archived"`
- `PUT /api/employees/restore/{id}` — Sets `Status="Active"`
- `DELETE /api/employees/{id}` — Hard delete

**Employee statuses:** `"Active"`, `"Inactive"`, `"Archived"`

---

### Module 10: Organization (Departments & Roles)

**Purpose:** Define the organizational structure — departments and designation/role definitions.

**Database entities:** `Departments`, `Roles`

**Operations:**
- Departments: full CRUD (Create, Read, Update, Archive/Restore)
- Roles (designations): full CRUD
- Both use archive/restore pattern via `Status` field (`"Active"` / `"Archived"`)

**DTOs:** `CreateDepartmentDto`, `UpdateDepartmentDto`, `CreateRoleDto`, `UpdateRoleDto`

---

### Module 11: Purchase Orders

**Purpose:** Record procurement requests and track purchase order status lifecycle.

**Database entity:** `PurchaseOrders`

**Archive behavior:** `Archived` bool field, same pattern as other entities.

**PO statuses:** `"Pending"`, `"Approved"`, `"Delivered"`, `"Cancelled"`

**Fields:** `AssetName`, `Category`, `Vendor`, `Manufacturer`, `Model`, `SerialNumber`, `PurchasePrice` (decimal 18,2), `PurchaseDate`, `UsefulLifeYears`, `Status`, `RequestedBy`, `CreatedAt`, `AssetId` (link to created asset after delivery), `TenantId`

---

## PHASE 4 — DATABASE SCHEMA DOCUMENTATION

### Table: `Users`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | int (PK, identity) | No | Auto-increment |
| `Name` | nvarchar | No | Required |
| `Email` | nvarchar | No | Required, unique (application-level) |
| `PasswordHash` | nvarchar | No | BCrypt hash, never serialized |
| `Role` | nvarchar | No | String role name |
| `RoleLabel` | nvarchar | No | Display label (same as Role in current data) |
| `Avatar` | nvarchar | Yes | Optional URL |
| `TenantId` | int | Yes | FK → `Tenants.Id`. Null = Super Admin |

---

### Table: `Tenants`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | int (PK, identity) | No | Auto-increment |
| `Name` | nvarchar | No | Required, unique |
| `SubscriptionPlan` | int | No | Enum: Starter=0, Basic=1, Pro=2 |
| `CreatedAt` | datetime2 | No | UTC, set on create |
| `Status` | nvarchar | No | Active / Inactive / Archived |
| `MaxRooms` | int | No | Plan-derived |
| `MaxPersonnel` | int | No | Plan-derived |
| `AssetTracking` | bit | No | Always true |
| `Depreciation` | bit | No | Always true |
| `MaintenanceModule` | bit | No | false=Starter, true=Basic/Pro |
| `ReportsLevel` | nvarchar | No | Standard / Able |

---

### Table: `Assets`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `TagNumber` | nvarchar | Yes | Unique per TenantId (partial unique index) |
| `Desc` | nvarchar | No | Required |
| `Cat` | nvarchar | Yes | Legacy free-text category field (unused in new records) |
| `CategoryId` | nvarchar | Yes | FK → `AssetCategories.Id` |
| `Status` | nvarchar | No | Active / Archived / Under Maintenance / etc. |
| `Room` | nvarchar | Yes | Free-text room reference |
| `Image` | nvarchar | Yes | URL or base64 |
| `Manufacturer` | nvarchar | Yes | |
| `Model` | nvarchar | Yes | |
| `SerialNumber` | nvarchar | Yes | |
| `PurchaseDate` | datetime2 | Yes | |
| `Vendor` | nvarchar | Yes | |
| `Value` | decimal(18,2) | No | Current market value |
| `UsefulLifeYears` | int | No | For straight-line depreciation |
| `PurchasePrice` | decimal(18,2) | No | Original cost |
| `CurrentBookValue` | decimal(18,2) | No | Calculated/updated by caller on edit |
| `MonthlyDepreciation` | decimal(18,2) | No | PurchasePrice / (UsefulLifeYears × 12) |
| `TenantId` | int | Yes | FK → Tenants |
| `WarrantyExpiry` | datetime2 | Yes | |
| `Notes` | nvarchar | Yes | |
| `Documents` | nvarchar | Yes | URLs/comma-separated |
| `Archived` | bit | No | Soft delete flag |

**Index:** `IX_Assets_TenantId_TagNumber` — unique, filtered `WHERE TagNumber IS NOT NULL`

---

### Table: `AssetCategories`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `Name` (mapped as `CategoryName`) | nvarchar | No | Column name in DB: `Name` |
| `Description` | nvarchar | No | |
| `HandlingType` | int | No | Fixed=0, Consumable=1, Movable=2 (default 0) |
| `Status` | nvarchar | No | Active / Archived |
| `TenantId` | int | Yes | null = global, set = tenant-private |

---

### Table: `MaintenanceRecords`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `AssetId` | nvarchar | No | String FK to Assets.Id (not DB-enforced) |
| `Description` | nvarchar | No | |
| `Status` | nvarchar | No | Pending / In Progress / Completed / Scheduled |
| `Priority` | nvarchar | No | Low / Medium / High |
| `Type` | nvarchar | No | Preventive / Corrective / Upgrade / Inspection |
| `Frequency` | nvarchar | Yes | One-time / Daily / Weekly / Monthly / Yearly |
| `StartDate` | datetime2 | Yes | |
| `EndDate` | datetime2 | Yes | |
| `Cost` | decimal(18,2) | Yes | |
| `DateReported` | datetime2 | No | Auto-set UTC now on create |
| `Attachments` | nvarchar | Yes | Comma-separated string |
| `Archived` | bit | No | |
| `CreatedAt` | datetime2 | No | Auto-set UTC now on create |
| `TenantId` | int | Yes | |

---

### Table: `Tasks`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `Title` | nvarchar | No | Required |
| `Description` | nvarchar | No | |
| `Priority` | nvarchar | No | Low / Medium / High |
| `Status` | nvarchar | No | Pending / In Progress / Completed / Cancelled |
| `AssignedTo` | nvarchar | Yes | Employee ID string |
| `DueDate` | datetime2 | Yes | |
| `CreatedAt` | datetime2 | No | Auto-set server-side on create |
| `Archived` | bit | No | |
| `TenantId` | int | Yes | |

---

### Table: `Rooms`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `UnitId` | nvarchar | No | Human-readable unit identifier |
| `Name` | nvarchar | No | |
| `Floor` | nvarchar | No | |
| `CategoryId` | nvarchar | Yes | FK → RoomCategories.Id |
| `Status` | nvarchar | No | Available / Occupied / Maintenance / Deactivated |
| `MaxOccupancy` | int | No | |
| `Archived` | bit | No | |
| `TenantId` | int | Yes | |

**Relationship:** `Room.CategoryId → RoomCategory.Id` (navigation property `RoomCategory` loaded via `Include()`)

---

### Table: `RoomCategories`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `Name` | nvarchar | No | Required |
| `SubCategory` | nvarchar | No | |
| `Description` | nvarchar | No | |
| `BaseRate` | decimal(18,2) | No | |
| `MaxOccupancy` | int | No | |
| `Status` | nvarchar | No | Active / Archived |
| `Archived` | bit | No | |
| `TenantId` | int | Yes | |

---

### Table: `Employees`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | Format: `EMP-{timestamp}` |
| `FirstName` | nvarchar | No | Required |
| `MiddleName` | nvarchar | Yes | |
| `LastName` | nvarchar | No | |
| `Email` | nvarchar | No | |
| `ContactNumber` | nvarchar | No | |
| `Department` | nvarchar | No | Free-text department name |
| `Role` | nvarchar | No | Free-text designation (NOT system access role) |
| `HireDate` | datetime2 | No | |
| `Status` | nvarchar | No | Active / Inactive / Archived |
| `TenantId` | int | Yes | |

---

### Table: `Departments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `Name` | nvarchar | No | Required |
| `Description` | nvarchar | No | |
| `Head` | nvarchar | No | Department head name |
| `Status` | nvarchar | No | Active / Archived |
| `TenantId` | int | Yes | |

---

### Table: `Roles`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `Designation` | nvarchar | No | Job title |
| `Department` | nvarchar | No | |
| `Scope` | nvarchar | No | Free-text scope description |
| `Status` | nvarchar | No | Active / Archived |
| `TenantId` | int | Yes | |

---

### Table: `PurchaseOrders`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | nvarchar (PK) | No | GUID string |
| `AssetName` | nvarchar | No | Required |
| `Category` | nvarchar | No | Free-text |
| `Vendor` | nvarchar | Yes | |
| `Manufacturer` | nvarchar | Yes | |
| `Model` | nvarchar | Yes | |
| `SerialNumber` | nvarchar | Yes | |
| `PurchasePrice` | decimal(18,2) | No | |
| `PurchaseDate` | nvarchar | Yes | String date |
| `UsefulLifeYears` | int | No | |
| `Status` | nvarchar | No | Pending / Approved / Delivered / Cancelled |
| `RequestedBy` | nvarchar | Yes | |
| `CreatedAt` | nvarchar | No | Date string, set on create |
| `AssetId` | nvarchar | Yes | Linked asset after delivery |
| `Archived` | bit | No | |
| `TenantId` | int | Yes | |

---

### Entity Relationship Summary

```
Tenants (1) ──────────── (N) Users
Tenants (1) ──────────── (N) Assets
Tenants (1) ──────────── (N) AssetCategories  [global categories have TenantId=null]
Tenants (1) ──────────── (N) MaintenanceRecords
Tenants (1) ──────────── (N) Tasks
Tenants (1) ──────────── (N) Rooms
Tenants (1) ──────────── (N) RoomCategories
Tenants (1) ──────────── (N) Employees
Tenants (1) ──────────── (N) Departments
Tenants (1) ──────────── (N) Roles (designations)
Tenants (1) ──────────── (N) PurchaseOrders

AssetCategories (1) ──── (N) Assets                [via CategoryId]
RoomCategories (1) ───── (N) Rooms                 [via CategoryId, navigation property]
Assets (1) ──────────── (N) MaintenanceRecords      [via AssetId — no DB FK constraint]
Assets (1) ──────────── (1) PurchaseOrders          [via AssetId — optional, set after delivery]
```

All FK relationships to `TenantId` are application-enforced (EF query filters), not DB-level cascade constraints.

---

## PHASE 5 — API ENDPOINT CATALOG

### Base: `/api/auth`

| Method | Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | None | `{ email, password }` | `{ token, user: UserResponseDto }` | Checks tenant Active status |
| GET | `/api/auth/me` | Any JWT | — | `UserResponseDto` | Session re-validation |
| POST | `/api/auth/register` | Super Admin, Admin | `RegisterDto` | `{ message, userId }` | Super Admin can assign any TenantId |

**UserResponseDto:** `{ id, name, email, role, roleLabel, avatar, tenantId }`

**RegisterDto:** `{ name, email, password (min 6), role, tenantId? }`

---

### Base: `/api/tenants`

| Method | Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|---|
| GET | `/api/tenants` | Super Admin | — | `Tenant[]` | All tenants |
| GET | `/api/tenants/{id}` | Super Admin | — | `Tenant` | Single tenant |
| POST | `/api/tenants` | Super Admin | `CreateTenantDto` | `Tenant` | Creates tenant + admin user atomically |
| PUT | `/api/tenants/{id}/status` | Super Admin | `{ status: string }` | `{ message, status }` | Valid: Active, Inactive, Archived |

**CreateTenantDto:** `{ tenantName, subscriptionPlan (enum int), adminName, adminEmail, adminPassword }`

---

### Base: `/api/assets`

| Method | Path | Auth | Query Params | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `/api/assets` | Admin, Finance, Maintenance, Procurement, Super Admin | `showArchived?: bool` | — | `AssetResponseDto[]` | Tenant-filtered |
| GET | `/api/assets/{id}` | Same | — | — | `AssetResponseDto` | 404 if wrong tenant |
| POST | `/api/assets` | Same | — | `CreateAssetDto` | `AssetResponseDto` | CategoryId required; TagNumber unique per tenant |
| PUT | `/api/assets/{id}` | Same | — | `UpdateAssetDto` | 204 | Caller provides book values |
| PUT | `/api/assets/allocate/{id}` | Same | — | `{ room: string }` | 204 | Changes room assignment only |
| PUT | `/api/assets/archive/{id}` | Same | — | — | 204 | Status=Archived + Archived=true |
| PUT | `/api/assets/restore/{id}` | Same | — | — | 204 | Status=Active + Archived=false |
| DELETE | `/api/assets/{id}` | Same | — | — | 204 | Hard delete |

**Error responses:**
- `400 { message: "CategoryId is required." }`
- `400 { message: "Invalid CategoryId." }`
- `409 { message: "TagNumber 'X' already exists for this tenant." }`

**AssetResponseDto fields:** `id, tagNumber, desc, categoryId, categoryName, handlingType, status, room, image, manufacturer, model, serialNumber, purchaseDate, vendor, value, usefulLifeYears, purchasePrice, currentBookValue, monthlyDepreciation, tenantId, warrantyExpiry, notes, documents, archived`

---

### Base: `/api/assetcategories`

| Method | Path | Auth | Query Params | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `/api/assetcategories` | Admin, Finance, Super Admin | `showArchived: bool` (default false) | — | `AssetCategoryResponseDto[]` | Includes live item count |
| GET | `/api/assetcategories/{id}` | Same | — | — | `AssetCategoryResponseDto` | |
| POST | `/api/assetcategories` | Same | — | `CreateAssetCategoryDto` | `AssetCategoryResponseDto` | TenantId auto-set from token |
| PUT | `/api/assetcategories/{id}` | Same | — | `UpdateAssetCategoryDto` | 204 | Name, HandlingType, Description only |
| PUT | `/api/assetcategories/archive/{id}` | Same | — | — | 204 | Status="Archived" |
| PUT | `/api/assetcategories/restore/{id}` | Same | — | — | 204 | Status="Active" |

**AssetCategoryResponseDto fields:** `id, categoryName, handlingType (int), description, status, tenantId, items (count)`

---

### Base: `/api/maintenance`

| Method | Path | Auth | Query Params | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `/api/maintenance` | Admin, Maintenance, Super Admin | `showArchived: bool` (default false) | — | `MaintenanceRecord[]` | Ordered by CreatedAt desc |
| GET | `/api/maintenance/{id}` | Same | — | — | `MaintenanceRecord` | |
| POST | `/api/maintenance` | Same | — | `CreateMaintenanceRecordDto` | `MaintenanceRecord` | DateReported + CreatedAt auto-set |
| PUT | `/api/maintenance/{id}` | Same | — | `UpdateMaintenanceRecordDto` | 204 | |
| PUT | `/api/maintenance/archive/{id}` | Same | — | — | 204 | Archived=true |
| PUT | `/api/maintenance/restore/{id}` | Same | — | — | 204 | Archived=false |
| DELETE | `/api/maintenance/{id}` | Same | — | — | 204 | Hard delete |

---

### Base: `/api/tasks`

| Method | Path | Auth | Query Params | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `/api/tasks` | Admin, Maintenance, Super Admin | `showArchived: bool` (default false) | — | `TaskItem[]` | Ordered by CreatedAt desc |
| GET | `/api/tasks/{id}` | Same | — | — | `TaskItem` | |
| POST | `/api/tasks` | Same | — | `CreateTaskDto` | `TaskItem` | CreatedAt auto-set |
| PUT | `/api/tasks/{id}` | Same | — | `UpdateTaskDto` | 204 | Includes Archived field |
| PUT | `/api/tasks/archive/{id}` | Same | — | — | 204 | Archived=true |
| PUT | `/api/tasks/restore/{id}` | Same | — | — | 204 | Archived=false |
| DELETE | `/api/tasks/{id}` | Same | — | — | 204 | Hard delete |

---

### Base: `/api/rooms`

| Method | Path | Auth | Query Params | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `/api/rooms` | Admin, Super Admin | `search?`, `categoryId?`, `status?` | — | `Room[]` (with RoomCategory) | status supports comma-separated |
| GET | `/api/rooms/{id}` | Same | — | — | `Room` (with RoomCategory) | |
| POST | `/api/rooms` | Same | — | `CreateRoomDto` | `Room` | |
| PUT | `/api/rooms/{id}` | Same | — | `UpdateRoomDto` | 204 | |
| PUT | `/api/rooms/archive/{id}` | Same | — | — | 204 | Archived=true, Status=Deactivated |
| PUT | `/api/rooms/restore/{id}` | Same | — | — | 204 | Archived=false, Status=Available |
| DELETE | `/api/rooms/{id}` | Same | — | — | 204 | Hard delete |

---

### Base: `/api/roomcategories`

| Method | Path | Auth | Query Params | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `/api/roomcategories` | Admin, Super Admin | `includeArchived?`, `search?` | — | `RoomCategory[]` | search on Name + Description |
| GET | `/api/roomcategories/{id}` | Same | — | — | `RoomCategory` | |
| POST | `/api/roomcategories` | Same | — | `CreateRoomCategoryDto` | `RoomCategory` | |
| PUT | `/api/roomcategories/{id}` | Same | — | `UpdateRoomCategoryDto` | 204 | |
| PUT | `/api/roomcategories/archive/{id}` | Same | — | — | 204 | Archived=true, Status=Archived |
| PUT | `/api/roomcategories/restore/{id}` | Same | — | — | 204 | Archived=false, Status=Active |
| DELETE | `/api/roomcategories/{id}` | Same | — | — | 204 | Hard delete |

---

### Base: `/api/employees`

| Method | Path | Auth | Query Params | Request Body | Response |
|---|---|---|---|---|---|
| GET | `/api/employees` | Admin, Super Admin | `showArchived: bool` | — | `Employee[]` |
| GET | `/api/employees/{id}` | Same | — | — | `Employee` |
| POST | `/api/employees` | Same | — | `CreateEmployeeDto` | `Employee` |
| PUT | `/api/employees/{id}` | Same | — | `UpdateEmployeeDto` | 204 |
| PUT | `/api/employees/archive/{id}` | Same | — | — | 204 (Status=Archived) |
| PUT | `/api/employees/restore/{id}` | Same | — | — | 204 (Status=Active) |
| DELETE | `/api/employees/{id}` | Same | — | — | 204 |

---

### System Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | None | Always returns `"API is Healthy"` |
| GET | `/api/db-test` | None (dev only) | Tests DB connectivity |
| Any | `/api/{**rest}` (unmatched) | — | 404 JSON `{ error, path }` |
| Any | `/*` (non-API) | — | Returns `wwwroot/index.html` (SPA fallback) |

---

## PHASE 6 — WORKFLOW DOCUMENTATION

### Workflow 1: Authentication Flow

```
1. User submits email + password to POST /api/auth/login
2. Backend: look up User by email
   → If not found: 401 "Invalid credentials"
3. Backend: if user has TenantId, look up Tenant
   → If tenant.Status != "Active": 401 "Your organization's account is inactive."
4. Backend: BCrypt.Verify(password, user.PasswordHash)
   → If false: 401 "Invalid credentials"
5. Backend: generate JWT with claims: NameIdentifier, Email, Role, TenantId (if set)
   → JWT valid for 7 days
6. Response: { token, user: UserResponseDto }
7. Frontend: stores token in localStorage["dfile_token"], user in localStorage["dfile_user"]
8. Frontend: sets AuthContext state (user, token, isLoggedIn=true)
9. Frontend: getDashboardPath(user.role) → redirect to role namespace
```

### Workflow 2: Session Restore on Page Load

```
1. Frontend mounts AuthProvider
2. Reads localStorage["dfile_token"] and ["dfile_user"]
3. If both exist:
   a. Optimistically set isLoggedIn=true (instant render, no flash)
   b. Call GET /api/auth/me with stored token
   c. If 200: session valid, continue
   d. If 401/error: call logout() → clear localStorage → redirect to /login
4. Set isLoading=false
```

### Workflow 3: Asset Creation Flow

```
1. User fills create-asset form and submits
2. Frontend: POST /api/assets with CreateAssetDto
3. Backend:
   a. Validate CategoryId exists in AssetCategories table
      → If missing/invalid: 400
   b. Check TagNumber uniqueness within TenantId
      → If conflict: 409
   c. Compute CurrentBookValue = PurchasePrice
   d. Compute MonthlyDepreciation = PurchasePrice / (UsefulLifeYears * 12) if UsefulLifeYears > 0
   e. Assign TenantId from JWT claim (Super Admin: null)
   f. Save to Assets table
4. Backend: reload category, enrich response with CategoryName + HandlingType
5. Frontend: TanStack Query invalidates ['assets'] → list auto-refreshes
6. Toast: "Asset added successfully"
```

### Workflow 4: Asset Depreciation Update Flow

```
Depreciation is NOT automatically recalculated by the backend on PUT /api/assets/{id}.
The frontend (or caller) must supply CurrentBookValue and MonthlyDepreciation in UpdateAssetDto.
The backend trusts and stores whatever values are passed.

Depreciation formula (straight-line):
  MonthlyDepreciation = PurchasePrice / (UsefulLifeYears * 12)
  CurrentBookValue    = PurchasePrice - (MonthlyDepreciation * months_elapsed)
```

### Workflow 5: Tenant Creation Flow (Super Admin)

```
1. Super Admin submits: TenantName, SubscriptionPlan, AdminName, AdminEmail, AdminPassword
2. Backend:
   a. Check AdminEmail uniqueness across all Users → 400 if exists
   b. Check TenantName uniqueness → 400 if exists
   c. Call Tenant.Create(name, plan) → sets plan limits automatically
   d. Save Tenant (to get generated Id)
   e. Create User: { Role="Admin", RoleLabel="Admin", TenantId=tenant.Id, PasswordHash=BCrypt.Hash(AdminPassword) }
   f. Save User
3. Response: 201 with Tenant object
```

### Workflow 6: Archive / Restore Flow (all entities)

```
Archive:
1. PUT /api/{entity}/archive/{id}
2. Backend: tenant isolation check → 404 if mismatch
3. Sets Archived=true (+ Status="Archived" or "Deactivated" depending on entity)
4. Entity only appears in showArchived=true queries

Restore:
1. PUT /api/{entity}/restore/{id}
2. Backend: tenant isolation check
3. Sets Archived=false (+ Status="Active" or "Available")
4. Entity reappears in default (non-archived) list
```

### Workflow 7: Route Guard Flow (Frontend)

```
1. User navigates to any /superadmin/* or /tenantadmin/* etc. route
2. AppShell mounts with requiredRole prop
3. Reads { user, isLoggedIn, isLoading } from AuthContext
4. If isLoading=true → render loading state (no redirect yet)
5. If isLoading=false AND !isLoggedIn → router.push("/login")
6. If isLoading=false AND isLoggedIn AND user.role !== requiredRole → router.push("/forbidden")
7. If role matches → render children (page content)
```

---

## PHASE 7 — BUSINESS RULES INDEX

| # | Rule | Enforced In | Detail |
|---|---|---|---|
| BR-01 | CategoryId required on asset create | `AssetsController.PostAsset` | 400 if null or not found in DB |
| BR-02 | TagNumber unique per tenant | `AssetsController` | DB index + app-level Conflict check → 409 on duplicate |
| BR-03 | Depreciation auto-calc on create only | `AssetsController.PostAsset` | `CurrentBookValue=PurchasePrice`, `Monthly=Price/(Life×12)` |
| BR-04 | Depreciation NOT auto-calc on update | `AssetsController.PutAsset` | Caller must supply both `CurrentBookValue` and `MonthlyDepreciation` |
| BR-05 | Tenant must be Active for login | `AuthController.Login` | 401 if `tenant.Status != "Active"` |
| BR-06 | Super Admin has null TenantId | Multiple | JWT has no TenantId claim → `IsSuperAdmin()=true` |
| BR-07 | Cross-tenant returns 404 not 403 | All TenantAware controllers | Prevents tenant enumeration |
| BR-08 | Global asset categories | `AssetCategoriesController` | `TenantId=null` visible to all tenants |
| BR-09 | HandlingType stored as int | `AppDbContext.OnModelCreating` | `HasConversion<int>()`, default 0 (Fixed) |
| BR-10 | Asset archive is dual-field | `AssetsController` | Both `Archived=true` and `Status="Archived"` set together |
| BR-11 | Room archive sets Status to Deactivated | `RoomsController` | Archive → `Status="Deactivated"`; Restore → `Status="Available"` |
| BR-12 | Employee ID auto-generated format | `EmployeesController.PostEmployee` | `EMP-{yyyyMMddHHmmssfff}` |
| BR-13 | Tenant status validated in controller | `TenantsController.UpdateTenantStatus` | Must be Active, Inactive, or Archived — 400 otherwise |
| BR-14 | Admin registration scoped to own tenant | `AuthController.Register` | Non-Super Admin cannot assign arbitrary TenantId |
| BR-15 | List endpoints ordered by CreatedAt desc | `MaintenanceController`, `TasksController` | `OrderByDescending(r => r.CreatedAt)` |
| BR-16 | Rooms include RoomCategory navigation | `RoomsController` | `Include(r => r.RoomCategory)` on all reads |
| BR-17 | PasswordHash never serialized | `User` model | `[JsonIgnore]` attribute |
| BR-18 | JWT key must be configured | `Program.cs` | `?? throw new InvalidOperationException(...)` on startup |
| BR-19 | Seeder runs in background task | `Program.cs` | 2-second delay, never blocks `app.Run()` |
| BR-20 | Seeder is idempotent | `DbInitializer` | All seed methods guard with `if (context.X.Any()) return;` or upsert |
| BR-21 | AssetCategory has no Archived bool field | `AssetCategory` model | Archive state tracked via `Status` string only (unlike all other entities) |
| BR-22 | Asset.Room is free-text, no FK | `Asset` model | No referential integrity to Rooms table |
| BR-23 | MaintenanceRecord.AssetId has no DB FK | `MaintenanceRecord` model | Application-only relationship, no cascade |
| BR-24 | Status string values not validated | Most controllers | Only `TenantsController` validates status string values |

---

## PHASE 8 — ROUTING STRUCTURE DOCUMENTATION

### Frontend Route Tree

```
/ (page.tsx)
  → If logged in:  redirect to getDashboardPath(user.role)
  → If logged out: redirect to /login

/(auth)/
  login/                              → Login page (no auth required)

/forbidden/                           → 403 forbidden page
/error/                               → Error boundary page
/not-found/                           → 404 page

/superadmin/                          → Layout: AppShell, requiredRole="Super Admin"
  dashboard/                          → Super Admin overview (tenant stats)
  create-tenant/                      → Tenant creation form

/tenantadmin/                         → Layout: AppShell, requiredRole="Admin"
  dashboard/                          → Tenant admin landing (asset/room overview)
  inventory/                          → Asset Registration (list, create, edit, archive)
  allocation/                         → Asset Allocation (assign assets to rooms)
  depreciation/                       → Asset Depreciation view (book values)
  rooms/                              → Room Units (list, create, edit, archive)
  organization/                       → Departments + Roles + Employees

/financemanager/                      → Layout: AppShell, requiredRole="Finance"
  dashboard/                          → Finance overview (asset valuations)
  depreciation/                       → Depreciation report

/maintenancemanager/                  → Layout: AppShell, requiredRole="Maintenance"
  dashboard/                          → Maintenance overview
  maintenance/                        → Maintenance Records (list, CRUD, archive)
  tasks/                              → Task Management (list, CRUD, archive)
```

### Role → Namespace → Dashboard Mapping

```typescript
"Super Admin"  → /superadmin      → /superadmin/dashboard
"Admin"        → /tenantadmin     → /tenantadmin/dashboard
"Finance"      → /financemanager  → /financemanager/dashboard
"Maintenance"  → /maintenancemanager → /maintenancemanager/dashboard
"Procurement"  → /tenantadmin     → /tenantadmin/dashboard
"Employee"     → /tenantadmin     → /tenantadmin/dashboard
```

### Route Guard Implementation

Each namespace layout passes `requiredRole` to `AppShell`. AppShell enforces:
1. `isLoading` → render skeleton, no redirect
2. `!isLoggedIn` → `router.push("/login")`
3. `user.role !== requiredRole` → `router.push("/forbidden")`
4. Match → render page content

Note: `requiredRole` is a single string. Procurement and Employee route to `/tenantadmin` but the layout's `requiredRole="Admin"` — this is a gap (see Limitations T01).

### Backend API Route Patterns

```
/api/auth/**                                  → AuthController
/api/tenants, /api/tenants/**                 → TenantsController
/api/assets, /api/assets/**                   → AssetsController
/api/assetcategories, /api/assetcategories/** → AssetCategoriesController
/api/maintenance, /api/maintenance/**         → MaintenanceController
/api/tasks, /api/tasks/**                     → TasksController
/api/rooms, /api/rooms/**                     → RoomsController
/api/roomcategories, /api/roomcategories/**   → RoomCategoriesController
/api/employees, /api/employees/**             → EmployeesController
/api/health                                   → inline minimal API
/api/db-test                                  → inline minimal API (dev only)
/api/{**rest}                                 → explicit 404 JSON
/**                                           → wwwroot/index.html (SPA fallback, LAST)
```

---

## PHASE 9 — STATE & DATA FLOW ANALYSIS (FRONTEND)

### State Management Architecture

| Layer | Tool | Purpose |
|---|---|---|
| Server state | TanStack Query v5 | All API data fetching, caching, mutations |
| Auth state | React Context (`AuthContext`) | User, token, login/logout, isLoading |
| UI state | Local `useState` | Modal open/close, form values, active tabs |
| Theme | `next-themes` ThemeProvider | Dark/light mode |

### TanStack Query Global Configuration

```typescript
staleTime: 60000           // 1 minute fresh window
refetchOnWindowFocus: false // No refetch on tab focus
```

### Hook Registry

| File | Domain | Exposed hooks |
|---|---|---|
| `use-assets.ts` | Assets | `useAssets`, `useAsset`, `useAddAsset`, `useUpdateAsset`, `useArchiveAsset`, `useRestoreAsset`, `useDeleteAsset`, `useAllocateAsset` |
| `use-categories.ts` | Asset Categories | `useCategories`, `useAddCategory`, `useUpdateCategory`, `useArchiveCategory`, `useRestoreCategory` |
| `use-maintenance.ts` | Maintenance Records | `useMaintenanceRecords`, `useAddMaintenance`, `useUpdateMaintenance`, `useArchiveMaintenance`, `useRestoreMaintenance`, `useDeleteMaintenance` |
| `use-rooms.ts` | Rooms + Room Categories | Full CRUD for both entities |
| `use-tasks.ts` | Tasks | Full CRUD + archive/restore |
| `use-organization.ts` | Employees, Departments, Roles | Full CRUD for all three |
| `use-procurement.ts` | Purchase Orders | Full CRUD + archive/restore |

### API Client Configuration

```typescript
// src/lib/api.ts
const api = axios.create({
    baseURL: getApiBaseUrl(),  // "" for same-origin production
    headers: { 'Content-Type': 'application/json' }
});

// Request interceptor:
// Reads localStorage.dfile_token → sets Authorization: Bearer {token}

// Response interceptor:
// Passes through (no global redirect on 401 — handled in AuthContext.initAuth)
```

### Standard Data Flow Pattern

```
User action (button click / form submit)
  ↓
Mutation hook (e.g. useAddAsset())
  ↓
api.post('/api/assets', payload)    ← Axios attaches JWT header
  ↓
Backend validates JWT + tenant scope + business rules
  ↓
201 Created (or 4xx error)
  ↓ onSuccess:
queryClient.invalidateQueries(['assets'])
  ↓
useAssets() re-fetches automatically
  ↓
Component re-renders with fresh data
  ↓
toast.success('Asset added successfully')
```

### Error Handling Patterns

| Scenario | Handler | Result |
|---|---|---|
| Mutation API error | `onError` in hook | `toast.error('Failed to ...')` |
| `GET /api/auth/me` returns 401 | `AuthContext.initAuth` catch | `logout()` → localStorage cleared → redirect to /login |
| Unmatched `/api/**` route | Backend middleware | 404 JSON `{ error, path }` |
| Unmatched frontend route | Next.js | `/not-found` page |
| React render error | `global-error.tsx` | Error boundary page |

### Form Validation

- All forms use React state for field values
- Pre-flight validation in form submit handlers (client-side, UX only)
- Real validation is backend-enforced

---

## PHASE 10 — DASHBOARD METRICS & CALCULATIONS

### Super Admin Dashboard (`/superadmin/dashboard`)

**Data source:** `GET /api/tenants`

| Metric | Calculation |
|---|---|
| Total tenants | `tenants.length` |
| Active tenants | `tenants.filter(t => t.status === "Active").length` |
| Tenants by plan | Group by `subscriptionPlan` enum value |
| Tenants by status | Group by `status` string |
| Recently created | Sort by `createdAt` descending |

---

### Tenant Admin Dashboard (`/tenantadmin/dashboard`)

**Data sources:** `GET /api/assets?showArchived=false`, `GET /api/assetcategories`, `GET /api/rooms`, `GET /api/maintenance`

All data is already tenant-scoped server-side.

| Metric | Calculation |
|---|---|
| Total active assets | `assets.length` |
| Assets by status | Group by `status` string |
| Assets by category | Group by `categoryName` from AssetResponseDto |
| Total purchase value | `sum(assets.purchasePrice)` |
| Total current book value | `sum(assets.currentBookValue)` |
| Potential depreciation loss | `totalPurchaseValue - totalBookValue` |
| Rooms by status | Group by `status` from Rooms list |
| Pending maintenance | `maintenance.filter(m => m.status === "Pending").length` |
| In-progress maintenance | `maintenance.filter(m => m.status === "In Progress").length` |

---

### Finance Dashboard (`/financemanager/dashboard`)

**Data sources:** `GET /api/assets?showArchived=false`, `GET /api/assetcategories`

| Metric | Calculation |
|---|---|
| Total asset valuation (purchase) | `sum(assets.purchasePrice)` |
| Total current book value | `sum(assets.currentBookValue)` |
| Total accumulated depreciation | `sum(assets.purchasePrice - assets.currentBookValue)` |
| Monthly depreciation rate | `sum(assets.monthlyDepreciation)` |
| Assets by handling type | Group by `handlingType` integer (0=Fixed, 1=Consumable, 2=Movable) |
| Per-category breakdown | Join assets with categories, sum values per category |

All depreciation values are pre-computed by the backend and stored on the asset record. No live recalculation occurs at query time.

---

### Finance Depreciation Page (`/financemanager/depreciation`)

Displays per-asset depreciation schedule. Frontend renders a table using the stored `currentBookValue` and `monthlyDepreciation` fields from each asset. No additional endpoint — reuses `GET /api/assets`.

---

### Maintenance Manager Dashboard (`/maintenancemanager/dashboard`)

**Data sources:** `GET /api/maintenance`, `GET /api/tasks`

| Metric | Calculation |
|---|---|
| Total maintenance records | `maintenance.length` |
| By status | Group by `status` string |
| By priority | Group by `priority` string |
| Overdue records | `endDate < today AND status !== "Completed"` |
| Open tasks | `tasks.filter(t => t.status !== "Completed" && !t.archived).length` |
| Tasks by priority | Group by `priority` string |
| Tasks due soon | `dueDate <= (today + 7 days) AND status !== "Completed"` |

---

## PHASE 11 — SECURITY MODEL

### Authentication Mechanism

| Property | Value |
|---|---|
| Type | JWT Bearer |
| Algorithm | HMAC-SHA256 (`HmacSha256Signature`) |
| Key source | `appsettings.json["Jwt:Key"]` (required; startup throws if missing) |
| Token lifetime | 7 days |
| Issuer validation | Disabled |
| Audience validation | Disabled |
| HTTPS metadata | Not required (`RequireHttpsMetadata=false`) |

### JWT Claims

```json
{
  "nameid": "<int user.Id>",
  "email": "<user.Email>",
  "role": "<user.Role>",
  "TenantId": "<user.TenantId>"    // claim absent for Super Admin
}
```

### Authorization Policies

Named policies are defined in `Program.cs` but **not used** via `[Authorize(Policy="...")]` — controllers use inline `[Authorize(Roles="...")]` instead.

| Policy Name | Effective Roles |
|---|---|
| `SuperAdminPolicy` | Super Admin |
| `TenantAdminPolicy` | Admin |
| `FinanceManagerPolicy` | Admin, Finance, Super Admin |
| `MaintenanceManagerPolicy` | Admin, Maintenance, Super Admin |
| `AnyTenantPolicy` | Admin, Finance, Maintenance, Super Admin |

### Tenant Data Isolation

Mechanism: `TenantAwareController` base class

```csharp
GetCurrentTenantId() → parses "TenantId" claim → returns int?
IsSuperAdmin()       → checks Role == "Super Admin" (no TenantId claim)

Every query: if (!IsSuperAdmin() && tenantId.HasValue)
               query = query.Where(x => x.TenantId == tenantId);
```

Cross-tenant access returns `404 NotFound` — not `403 Forbidden`. This prevents a malicious user from enumerating which IDs exist in other tenants.

### CORS

```
AllowAnyOrigin + AllowAnyMethod + AllowAnyHeader
```
Open CORS policy. Auth is enforced via JWT only, not origin restriction.

### Static File Security

`UseStaticFiles()` is placed **first** in the middleware pipeline. Static asset requests (`.js`, `.css`, images) are served before any auth or CORS middleware runs — intentional performance optimization.

### Sensitive Data Protection

- `PasswordHash` — `[JsonIgnore]` attribute, never appears in any API response
- JWT key — read from config, not hardcoded; startup fails if absent
- Connection string — in `appsettings.json`, overridable via env vars using double-underscore notation: `ConnectionStrings__DefaultConnection`
- Swagger — disabled in production (`if app.Environment.IsDevelopment()`)

---

## PHASE 12 — SYSTEM LIMITATIONS & TECHNICAL DEBT

### T01 — Procurement and Employee Cannot Access Their Own Namespace

`Procurement` and `Employee` roles are routed to `/tenantadmin/*` by `getDashboardPath()`, but the `/tenantadmin` layout's `AppShell` has `requiredRole="Admin"`. Role check `user.role !== "Admin"` evaluates `true` for Procurement/Employee users → redirect to `/forbidden`. These roles cannot currently access any frontend page. The guard logic needs `requiredRoles: UserRole[]` support or separate namespaces.

### T02 — Asset.Room Is Free-Text, Not a Foreign Key

`Asset.Room` is a plain string set via `PUT /api/assets/allocate/{id}`. No validation against `Rooms.UnitId` or `Rooms.Name`. A room can be deleted with assets still referencing it — room string becomes orphaned with no way to detect or clean up.

### T03 — MaintenanceRecord.AssetId Has No Database FK Constraint

`MaintenanceRecord.AssetId` is a string field with no EF-modeled or DB-level foreign key relationship. Assets can be hard-deleted while maintenance records still reference them. No cascade delete or integrity check exists.

### T04 — No Pagination on Any List Endpoint

All GET list endpoints return the complete dataset. With 120+ assets or 80+ maintenance records, HTTP payloads are large. As production data grows this becomes a latency and memory issue.

### T05 — No Server-Side Search or Filter on Assets

`GET /api/assets` supports only `showArchived` filter. No server-side search by tag, description, category, status, room, or vendor. All filtering is client-side, requiring the full dataset to be transferred.

### T06 — PurchaseOrder Date Fields Are Stored as Strings

`PurchaseOrder.PurchaseDate` (`string?`) and `PurchaseOrder.CreatedAt` (`string`) are stored as string dates (`yyyy-MM-dd`), unlike every other entity which uses `DateTime`/`datetime2`. This breaks date sorting and range filtering.

### T07 — Depreciation Values Not Auto-Recalculated on Update

When an asset's `PurchasePrice` or `UsefulLifeYears` is updated via `PUT /api/assets/{id}`, the backend does not recalculate `MonthlyDepreciation` or `CurrentBookValue`. The frontend must submit correct values. If the frontend submits 0 (initial default), those values are silently stored as 0.

### T08 — Status and Priority Fields Not Validated

`MaintenanceRecord.Status`, `MaintenanceRecord.Priority`, `MaintenanceRecord.Type`, `TaskItem.Status`, `TaskItem.Priority`, and `Asset.Status` are all free-text strings. Only `Tenant.Status` is validated in the controller. Any string can be stored — `"UNKNOWN_STATUS"` is as valid as `"Active"`.

### T09 — CORS Policy Is Fully Open

`AllowAnyOrigin` is appropriate for development but is overly permissive for a production SaaS. Any origin can make authenticated API calls if a valid JWT is obtained.

### T10 — Employee.Role vs User.Role Naming Collision

`Employee.Role` is a free-text job designation string (e.g., "IT Technician"). `User.Role` is the system access role (e.g., "Admin"). Both fields are named `Role`. They are entirely different concepts and the naming collision can cause confusion in the UI.

### T11 — AssetCategory Uses Status String Only (Inconsistent with Other Entities)

All other entities that support archiving have both `bool Archived` and `string Status`. `AssetCategory` has only `string Status`. UI archive/restore logic for categories must follow a different pattern than all other modules.

### T12 — Organization Controller Not Verified

`OrganizationDtos.cs`, `Department` model, `Role` model, `AppDbContext.Departments`, and `AppDbContext.Roles` all exist. The frontend has an `/tenantadmin/organization` route. However, no `OrganizationController.cs` appears in the backend `Controllers/` directory listing. The organization backend routes may be missing or named differently.

### T13 — No Audit Trail

There are no `CreatedBy`, `UpdatedAt`, or `UpdatedBy` fields on any entity (except `MaintenanceRecord.CreatedAt` and `DateReported`). There is no history of who made changes or when records were last modified.

### T14 — No Purchase Order Endpoint Confirmed

`PurchaseOrderDtos.cs` and `PurchaseOrder` model exist. `use-procurement.ts` hook exists in the frontend. No `PurchaseOrdersController.cs` is visible in the Controllers listing. Procurement functionality may lack backend implementation.

---

## APPENDIX A — SEED ACCOUNTS (Development/Testing)

| Role | Email | Password | Tenant |
|---|---|---|---|
| Super Admin | superadmin@dfile.com | superadmin123 | — |
| Super Admin | superadmin2@dfile.com | superadmin456 | — |
| Admin | admin.alpha@dfile.com | admin123 | Alpha Holdings (Pro) |
| Finance | finance.alpha@dfile.com | finance123 | Alpha Holdings |
| Maintenance | maintenance.alpha@dfile.com | maintenance123 | Alpha Holdings |
| Employee | employee.alpha@dfile.com | employee123 | Alpha Holdings |
| Admin | admin.beta@dfile.com | admin456 | Beta Industries (Basic) |
| Finance | finance.beta@dfile.com | finance456 | Beta Industries |
| Maintenance | maintenance.beta@dfile.com | maintenance456 | Beta Industries |
| Admin | admin.gamma@dfile.com | admin789 | Gamma Logistics (Starter) |

---

## APPENDIX B — KEY FILES REFERENCE

| File | Purpose |
|---|---|
| `DFile.backend/Program.cs` | Middleware pipeline, CORS, JWT, SPA fallback, seed trigger |
| `DFile.backend/Data/AppDbContext.cs` | EF DbSets, model configurations, decimal precision, unique indexes |
| `DFile.backend/Data/DbInitializer.cs` | Migration runner + all seed data (idempotent) |
| `DFile.backend/Models/*.cs` | All entity models |
| `DFile.backend/DTOs/*.cs` | All request/response DTOs |
| `DFile.backend/Controllers/*.cs` | All API controllers |
| `DFile.backend/web.config` | IIS deployment config — committed, SDK overwrite disabled |
| `DFile.frontend/src/lib/api.ts` | Central Axios instance with JWT interceptor |
| `DFile.frontend/src/lib/api-base-url.ts` | `NEXT_PUBLIC_API_URL` resolution + guard logic |
| `DFile.frontend/src/contexts/auth-context.tsx` | Auth state, login/logout, session re-validation |
| `DFile.frontend/src/lib/role-routing.ts` | getDashboardPath(), getRoleNamespace() |
| `DFile.frontend/src/types/asset.ts` | All shared frontend domain interfaces |
| `DFile.frontend/src/components/app-shell.tsx` | App shell with collapsible sidebar, nav, role guard |
| `DFile.frontend/src/hooks/*.ts` | TanStack Query hooks, one file per domain |
| `DFile.frontend/src/app/*/layout.tsx` | Role-namespace layouts with nav config |

---

## APPENDIX C — BUILD & DEPLOYMENT COMMANDS

```powershell
# Frontend dev (live reload — proxies /api/* to localhost:5090)
cd DFile.frontend ; npm run dev

# Backend dev
cd DFile.backend ; $env:ASPNETCORE_ENVIRONMENT = "Development"; dotnet run

# Build frontend → output to DFile.backend/wwwroot (Windows/IIS deployment)
cd DFile.frontend ; npm run build

# Publish backend for FTP deployment
cd DFile.backend ; dotnet publish -c Release -o ./publish

# EF migrations
cd DFile.backend ; $env:ASPNETCORE_ENVIRONMENT = "Development"; dotnet ef migrations add <Name>
cd DFile.backend ; $env:ASPNETCORE_ENVIRONMENT = "Development"; dotnet ef database update

# Full Docker build
docker compose up --build
```
