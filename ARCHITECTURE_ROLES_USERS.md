# DFile System Architecture: Roles, Users, and Authorization

**Last Updated:** April 27, 2026  
**Scope:** Complete exploration of role/user models, RBAC implementation, admin interfaces, and tenant management

---

## 1. Current Database Models & Schema

### 1.1 User Model
**File:** [DFile.backend/Models/User.cs](DFile.backend/Models/User.cs)

```csharp
public class User {
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }           // Unique, required
    public string PasswordHash { get; set; }    // BCrypt, never serialized
    public string Role { get; set; }            // "Super Admin", "Admin", "Finance", "Maintenance", "Procurement", "Employee"
    public string RoleLabel { get; set; }       // Display label (may differ, e.g. "Finance Manager")
    public string? Avatar { get; set; }
    public string Status { get; set; }          // "Active", "Inactive", "Archived"
    public DateTime CreatedAt { get; set; }
    public int? TenantId { get; set; }          // FK to Tenant (null = Super Admin)
    public Tenant? Tenant { get; set; }
}
```

**Database Table:** `Users`
- **Indexes:** Email (unique), TenantId, Status
- **Constraint:** FK TenantId → Tenants.Id (OnDelete: Restrict)

---

### 1.2 Tenant Model
**File:** [DFile.backend/Models/Tenant.cs](DFile.backend/Models/Tenant.cs)

```csharp
public enum SubscriptionPlanType { Starter, Basic, Pro }

public class Tenant {
    public int Id { get; set; }
    public string Name { get; set; }
    public string BusinessAddress { get; set; }
    public SubscriptionPlanType SubscriptionPlan { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Status { get; set; }          // "Active", "Inactive"
    
    // Plan-based limits
    public int MaxRooms { get; set; }
    public int MaxPersonnel { get; set; }
    public bool AssetTracking { get; set; }
    public bool Depreciation { get; set; }
    public bool MaintenanceModule { get; set; }
    public string ReportsLevel { get; set; }    // "Standard", "Able"
}
```

**Subscription Limits by Plan:**
| Plan | MaxRooms | MaxPersonnel | MaintenanceModule | ReportsLevel |
|------|----------|--------------|-------------------|--------------|
| Starter | 20 | 10 | No | Standard |
| Basic | 100 | 30 | Yes | Standard |
| Pro | 200 | 200 | Yes | Able |

**Database Table:** `Tenants`

---

### 1.3 Role-Based Access Control (RBAC) System

#### 1.3.1 RoleTemplate Model (System-wide role blueprints)
**File:** [DFile.backend/Models/RoleTemplate.cs](DFile.backend/Models/RoleTemplate.cs)

```csharp
public class RoleTemplate {
    public int Id { get; set; }
    public string Name { get; set; }            // "Super Admin", "Admin", "Finance Manager", "Maintenance Manager", "Procurement Manager", "Employee"
    public string? Description { get; set; }
    public bool IsSystem { get; set; }          // System templates (seeded) cannot be deleted
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<RolePermission> Permissions { get; set; }
    public ICollection<TenantRole> TenantRoles { get; set; }
}
```

**Database Table:** `RoleTemplates`

---

#### 1.3.2 RolePermission Model (Per-module permissions)
**File:** [DFile.backend/Models/RolePermission.cs](DFile.backend/Models/RolePermission.cs)

```csharp
public class RolePermission {
    public int Id { get; set; }
    public int RoleTemplateId { get; set; }
    public RoleTemplate RoleTemplate { get; set; }
    public string ModuleName { get; set; }      // "Assets", "Rooms", "Departments", "Employees", "Maintenance", "Reports", etc.
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanApprove { get; set; }
    public bool CanArchive { get; set; }
}
```

**Database Table:** `RolePermissions`
- **Unique Index:** (RoleTemplateId, ModuleName)
- **Constraint:** FK RoleTemplateId → RoleTemplates.Id (OnDelete: Cascade)

---

#### 1.3.3 TenantRole Model (Tenant-specific role instances)
**File:** [DFile.backend/Models/TenantRole.cs](DFile.backend/Models/TenantRole.cs)

```csharp
public class TenantRole {
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; }
    public int RoleTemplateId { get; set; }
    public RoleTemplate RoleTemplate { get; set; }
    public string? CustomLabel { get; set; }    // Optional tenant-specific role label (e.g., "Head of Finance")
    public ICollection<UserRoleAssignment> UserAssignments { get; set; }
}
```

**Database Table:** `TenantRoles`
- **Unique Index:** (TenantId, RoleTemplateId)
- **Constraints:**
  - FK TenantId → Tenants.Id (OnDelete: Cascade)
  - FK RoleTemplateId → RoleTemplates.Id (OnDelete: Restrict)

---

#### 1.3.4 UserRoleAssignment Model (User ↔ TenantRole mapping)
**File:** [DFile.backend/Models/UserRoleAssignment.cs](DFile.backend/Models/UserRoleAssignment.cs)

```csharp
public class UserRoleAssignment {
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    public int TenantRoleId { get; set; }
    public TenantRole TenantRole { get; set; }
    public DateTime AssignedAt { get; set; }
}
```

**Database Table:** `UserRoleAssignments`
- **Unique Index:** (UserId, TenantRoleId)
- **Constraints:**
  - FK UserId → Users.Id (OnDelete: Cascade)
  - FK TenantRoleId → TenantRoles.Id (OnDelete: Restrict)

---

### 1.4 Three "Role" Concepts (Critical Distinction)

| Concept | Storage | Purpose | Usage |
|---------|---------|---------|-------|
| **Module Permissions (RBAC)** | `UserRoleAssignments` → `TenantRoles` → `RoleTemplates` → `RolePermissions` | API endpoint authorization | `[RequirePermission("Assets", "CanView")]` on controller actions; `PermissionService.HasPermission()` |
| **Organizational Designations** | `Roles` table (string PK, `RoleCode`, `Designation`) | HR-style job titles per department | `/api/Roles` endpoint for org structure; NOT used by PermissionService |
| **JWT User Role** | `Users.Role` (string, synced from RoleTemplate.Name) | Token claims & `[Authorize(Roles = "...")]` | Login, `User.IsInRole()`, policy-based auth |

**Migration Link:** [DFile.backend/Migrations/20260323091128_SyncUserRoleFromRbacAssignments.cs](DFile.backend/Migrations/20260323091128_SyncUserRoleFromRbacAssignments.cs)  
Backfills `Users.Role` / `Users.RoleLabel` from primary `UserRoleAssignment` to keep JWT in sync with RBAC.

---

## 2. Authorization & Permission Implementation

### 2.1 Permission Service
**File:** [DFile.backend/Services/PermissionService.cs](DFile.backend/Services/PermissionService.cs)

**Key Method:**
```csharp
public async Task<List<ModulePermissionDto>> GetUserPermissions(int userId, int tenantId)
```

**Chain:** `User` → `UserRoleAssignment` → `TenantRole` → `RoleTemplate` → `RolePermission`

**Features:**
- Resolves effective permissions by merging all assignments (OR logic)
- 5-minute in-memory cache per (userId, tenantId) pair
- Returns list of `ModulePermissionDto` with flags: CanView, CanCreate, CanEdit, CanApprove, CanArchive

---

### 2.2 Authorization Attributes

#### RequirePermissionAttribute
**File:** [DFile.backend/Authorization/RequirePermissionAttribute.cs](DFile.backend/Authorization/RequirePermissionAttribute.cs)

```csharp
[RequirePermission("Assets", "CanView")]
public async Task<ActionResult> GetAssets() { }
```

---

#### PermissionAuthorizationFilter
**File:** [DFile.backend/Authorization/PermissionAuthorizationFilter.cs](DFile.backend/Authorization/PermissionAuthorizationFilter.cs)

**Global Filter:** Applied to all controllers in `Program.cs`

**Logic:**
1. Checks `RequirePermissionAttribute` on action
2. Super Admin bypasses all permission checks
3. Tenant users: looks up permissions via `PermissionService`
4. Returns 403 Forbidden if permission denied

---

#### ClaimsPrincipalExtensions
**File:** [DFile.backend/Authorization/ClaimsPrincipalExtensions.cs](DFile.backend/Authorization/ClaimsPrincipalExtensions.cs)

```csharp
public static string? GetJwtRole(this ClaimsPrincipal user) =>
    user.FindFirst(ClaimTypes.Role)?.Value
    ?? user.FindFirst("role")?.Value;
```

---

### 2.3 Module Registry
**File:** [DFile.backend/Constants/ModuleRegistry.cs](DFile.backend/Constants/ModuleRegistry.cs)

**23 Modules Defined Across 3 Namespaces:**

**Admin Namespace (12 modules):**
Dashboard, OrganizationStructure, Departments, Users, Roles, Billing, AuditLogs, Registration&Tagging, Allocation, Disposals, Locations, Maintenance

**Finance Namespace (7 modules):**
Dashboard, Assets, Disposals, Reports, Depreciation, MaintenanceRequests, MaintenanceOverview

**Maintenance Namespace (4 modules):**
Dashboard, Schedules, PartsReady, RepairHistory

---

### 2.4 User Role Constants
**File:** [DFile.backend/Constants/UserRoleConstants.cs](DFile.backend/Constants/UserRoleConstants.cs)

```csharp
public const string SuperAdmin = "Super Admin";
public const string Admin = "Admin";
public const string Finance = "Finance";
public const string Maintenance = "Maintenance";
public const string Procurement = "Procurement";
public const string Employee = "Employee";
```

**Role Mapping:** `Finance Manager` → `Finance`, `Maintenance Manager` → `Maintenance` (for JWT/policy matching)

---

## 3. User Creation Flow

### 3.1 Backend: Register Endpoint
**File:** [DFile.backend/Controllers/AuthController.cs](DFile.backend/Controllers/AuthController.cs) (lines 130–200)

**Endpoint:** `POST /api/auth/register`  
**Authorization:** `[Authorize(Roles = "Super Admin,Admin")]`

**Request DTO:**
```csharp
public class RegisterDto {
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }        // Min 6 characters
    public int RoleTemplateId { get; set; }    // Link to RoleTemplate
    public int? TenantId { get; set; }         // Null for Super Admin
}
```

**Response DTO:** `UserResponseDto` (includes permissions)

**Flow:**
1. Validate email uniqueness
2. Resolve `RoleTemplate` by ID (must exist, not archived)
3. Determine tenant:
   - Super Admin caller → uses `dto.TenantId`
   - Tenant Admin caller → restricted to own tenant
4. Create `User` with hashed password (BCrypt)
5. If tenant-scoped:
   - Find or create `TenantRole` for (tenant, template)
   - Create `UserRoleAssignment` linking user to tenant role
6. Sync `Users.Role` / `Users.RoleLabel` from template name

---

### 3.2 Frontend: Registration/Admin User Creation

**Registration Page (Self-Signup):**  
[DFile.frontend/src/app/(auth)/register/page.tsx](DFile.frontend/src/app/(auth)/register/page.tsx)

**Admin User Creation (Tenant Admin):**  
[DFile.frontend/src/app/tenant/users/page.tsx](DFile.frontend/src/app/tenant/users/page.tsx)  
- Modal: [DFile.frontend/src/components/modals/add-employee-modal.tsx](DFile.frontend/src/components/modals/add-employee-modal.tsx)
- Hook: [DFile.frontend/src/hooks/use-organization.ts](DFile.frontend/src/hooks/use-organization.ts)

**Add Tenant Admin (Super Admin):**  
Super Admin can create users for any tenant via same `/api/auth/register` endpoint with explicit `TenantId`.

---

## 4. Frontend Routes & Admin Interfaces

### 4.1 Role-Based Routing
**File:** [DFile.frontend/src/lib/role-routing.ts](DFile.frontend/src/lib/role-routing.ts)

```typescript
function getDashboardPath(role: UserRole): string {
    "Super Admin" → "/superadmin/dashboard"
    "Admin"       → "/tenant/dashboard"
    "Finance"     → "/finance/dashboard"
    "Maintenance" → "/maintenance/dashboard"
}
```

**Frontend User Roles:**
```typescript
type UserRole = 'Super Admin' | 'Admin' | 'Finance' | 'Maintenance';
```

---

### 4.2 Admin Routes

#### Super Admin Routes (`/superadmin/...`)
**Base:** [DFile.frontend/src/app/superadmin/layout.tsx](DFile.frontend/src/app/superadmin/layout.tsx)

| Route | File | Purpose |
|-------|------|---------|
| `/superadmin/dashboard` | [page.tsx](DFile.frontend/src/app/superadmin/dashboard/page.tsx) | Platform overview, key metrics |
| `/superadmin/tenant-oversight` | [page.tsx](DFile.frontend/src/app/superadmin/tenant-oversight/page.tsx) | Manage tenants, subscriptions, status |
| `/superadmin/role-templates` | [page.tsx](DFile.frontend/src/app/superadmin/role-templates/page.tsx) | List, create, edit, archive role templates |
| `/superadmin/role-templates/create` | [create/page.tsx](DFile.frontend/src/app/superadmin/role-templates/create/page.tsx) | Create new role template with permissions |
| `/superadmin/role-templates/[id]/edit` | [edit/page.tsx](DFile.frontend/src/app/superadmin/role-templates/edit/page.tsx) | Edit existing template |
| `/superadmin/audit-center` | [page.tsx](DFile.frontend/src/app/superadmin/audit-center/page.tsx) | Platform audit logs |
| `/superadmin/risk-monitor` | [page.tsx](DFile.frontend/src/app/superadmin/risk-monitor/page.tsx) | System health & risk alerts |
| `/superadmin/platform-metrics` | [page.tsx](DFile.frontend/src/app/superadmin/platform-metrics/page.tsx) | Platform usage analytics |
| `/superadmin/emergency-controls` | [page.tsx](DFile.frontend/src/app/superadmin/emergency-controls/page.tsx) | Emergency system controls |

---

#### Tenant Admin Routes (`/tenant/...`)
**Base:** [DFile.frontend/src/app/tenant/layout.tsx](DFile.frontend/src/app/tenant/layout.tsx)

| Route | File | Purpose |
|-------|------|---------|
| `/tenant/dashboard` | [dashboard/page.tsx](DFile.frontend/src/app/tenant/dashboard/page.tsx) | Tenant overview |
| `/tenant/organization` | [organization/page.tsx](DFile.frontend/src/app/tenant/organization/page.tsx) | Org structure mgmt (departments, roles, employees) |
| `/tenant/departments` | [departments/page.tsx](DFile.frontend/src/app/tenant/departments/page.tsx) | Department CRUD |
| `/tenant/users` | [users/page.tsx](DFile.frontend/src/app/tenant/users/page.tsx) | **User management & creation** |
| `/tenant/roles` | [roles/page.tsx](DFile.frontend/src/app/tenant/roles/page.tsx) | Organizational role designations |
| `/tenant/billing` | [billing/page.tsx](DFile.frontend/src/app/tenant/billing/page.tsx) | Billing & subscription management |
| `/tenant/audit-logs` | [audit-logs/page.tsx](DFile.frontend/src/app/tenant/audit-logs/page.tsx) | Tenant audit logs |
| `/tenant/inventory` | [inventory/page.tsx](DFile.frontend/src/app/tenant/inventory/page.tsx) | Asset registration & tagging |
| `/tenant/allocation` | [allocation/page.tsx](DFile.frontend/src/app/tenant/allocation/page.tsx) | Asset allocation |
| `/tenant/locations` | [locations/page.tsx](DFile.frontend/src/app/tenant/locations/page.tsx) | Room/location management |

---

#### Finance Routes (`/finance/...`)
**Base:** [DFile.frontend/src/app/finance/layout.tsx](DFile.frontend/src/app/finance/layout.tsx)

| Route | File | Role Restriction |
|-------|------|------------------|
| `/finance/dashboard` | [dashboard/page.tsx](DFile.frontend/src/app/finance/dashboard/page.tsx) | Finance only |
| `/finance/assets` | [assets/page.tsx](DFile.frontend/src/app/finance/assets/page.tsx) | Finance |
| `/finance/depreciation` | [depreciation/page.tsx](DFile.frontend/src/app/finance/depreciation/page.tsx) | Finance |
| `/finance/disposals` | [disposals/page.tsx](DFile.frontend/src/app/finance/disposals/page.tsx) | Finance |
| `/finance/reports` | [reports/page.tsx](DFile.frontend/src/app/finance/reports/page.tsx) | Finance |
| `/finance/maintenance-requests` | [maintenance-requests/page.tsx](DFile.frontend/src/app/finance/maintenance-requests/page.tsx) | Finance |
| `/finance/maintenance` | [maintenance/page.tsx](DFile.frontend/src/app/finance/maintenance/page.tsx) | Finance |
| `/finance/procurement-approvals` | [procurement-approvals/page.tsx](DFile.frontend/src/app/finance/procurement-approvals/page.tsx) | Finance |

---

#### Maintenance Routes (`/maintenance/...`)
**Base:** [DFile.frontend/src/app/maintenance/layout.tsx](DFile.frontend/src/app/maintenance/layout.tsx)

| Route | File | Role Restriction |
|-------|------|------------------|
| `/maintenance/dashboard` | [dashboard/page.tsx](DFile.frontend/src/app/maintenance/dashboard/page.tsx) | Maintenance only |
| `/maintenance/schedules` | [schedules/page.tsx](DFile.frontend/src/app/maintenance/schedules/page.tsx) | Maintenance |
| `/maintenance/asset-condition` | [asset-condition/page.tsx](DFile.frontend/src/app/maintenance/asset-condition/page.tsx) | Maintenance |
| `/maintenance/work-orders` | [work-orders/page.tsx](DFile.frontend/src/app/maintenance/work-orders/page.tsx) | Maintenance |
| `/maintenance/parts-ready` | [parts-ready/page.tsx](DFile.frontend/src/app/maintenance/parts-ready/page.tsx) | Maintenance |
| `/maintenance/repair-history` | [repair-history/page.tsx](DFile.frontend/src/app/maintenance/repair-history/page.tsx) | Maintenance |
| `/maintenance/finance` | [finance/page.tsx](DFile.frontend/src/app/maintenance/finance/page.tsx) | Maintenance |

---

### 4.3 Navigation Configuration
**File:** [DFile.frontend/src/lib/nav-config.ts](DFile.frontend/src/lib/nav-config.ts)

- Role-based nav items filtered by:
  1. `requiredModules` (checked against user permissions)
  2. `allowedRoles` (explicit role restrictions, e.g., Finance-only items)
- Super Admin sees entire platform nav; tenant users see only accessible items

---

## 5. Related Modals and Components

### 5.1 User Management Modals

| Modal | File | Purpose |
|-------|------|---------|
| Add Employee | [add-employee-modal.tsx](DFile.frontend/src/components/modals/add-employee-modal.tsx) | Create new user (tenant admin) |
| Employee Details | [employee-details-modal.tsx](DFile.frontend/src/components/modals/employee-details-modal.tsx) | View employee info |
| Change Role | [change-role-modal.tsx](DFile.frontend/src/components/modals/change-role-modal.tsx) | Reassign organizational role |

### 5.2 Role Template Modals

| Modal | File | Purpose |
|-------|------|---------|
| Create Role Template | (Inline in `/superadmin/role-templates/create/`) | New role with permissions |
| Edit Role Template | (Inline in `/superadmin/role-templates/edit/`) | Modify role permissions |

---

## 6. Backend Controllers (Role & User Management)

| Controller | File | Key Endpoints | Authorization |
|------------|------|---------------|-----------------|
| **AuthController** | [AuthController.cs](DFile.backend/Controllers/AuthController.cs) | POST /api/auth/register (user creation), POST /api/auth/login, GET /api/auth/me | Public (register), Super Admin/Admin for register, Bearer token for me |
| **RoleTemplatesController** | [RoleTemplatesController.cs](DFile.backend/Controllers/RoleTemplatesController.cs) | GET, POST, PUT, DELETE role templates; GET /available | Super Admin for CRUD, Admin/Super Admin for available |
| **RolesController** | [RolesController.cs](DFile.backend/Controllers/RolesController.cs) | CRUD organizational roles (Designation, Department) | RequirePermission("Departments", "CanView/Create/Edit") |
| **TenantsController** | [TenantsController.cs](DFile.backend/Controllers/TenantsController.cs) | Self-service org signup, tenant CRUD (Super Admin) | Public for /register; Super Admin for admin CRUD |

---

## 7. Frontend Hooks (Query/Mutation)

| Hook File | Key Functions | Endpoints |
|-----------|---------------|-----------|
| [use-role-templates.ts](DFile.frontend/src/hooks/use-role-templates.ts) | `useRoleTemplates()`, `useCreateRoleTemplate()`, `useUpdateRoleTemplate()`, `useDeleteRoleTemplate()`, `useArchiveRoleTemplate()` | GET, POST, PUT, DELETE /api/role-templates |
| [use-organization.ts](DFile.frontend/src/hooks/use-organization.ts) | `useAddEmployee()`, `useUpdateEmployee()`, `useArchiveEmployee()`, `useRestoreEmployee()`, `useRoles()`, `useDepartments()` | POST, PUT /api/employees; GET /api/roles, /api/departments |
| [use-permissions.ts](DFile.frontend/src/hooks/use-permissions.ts) | `useUserPermissions()` | GET /api/auth/me (includes permissions) |
| [use-tenants.ts](DFile.frontend/src/hooks/use-tenants.ts) | `useTenants()`, `useCreateTenant()`, etc. | GET, POST /api/tenants |

---

## 8. Authentication & Session Management

### 8.1 Auth Context
**File:** [DFile.frontend/src/contexts/auth-context.tsx](DFile.frontend/src/contexts/auth-context.tsx)

**Features:**
- Token + user stored in `localStorage` as `dfile_token` / `dfile_user`
- Optimistic restore on mount (non-blocking)
- Background re-validation via `GET /api/auth/me`
- Role normalization (maps `Finance Manager` → `Finance`)
- Logout clears session on invalid token (401/403)

---

### 8.2 JWT Implementation
**File:** [DFile.backend/Controllers/AuthController.cs](DFile.backend/Controllers/AuthController.cs)

**Claims:**
- `ClaimTypes.NameIdentifier` → User.Id
- `ClaimTypes.Role` → User.Role (from RoleTemplate.Name)
- Custom claim `"TenantId"` → User.TenantId (for tenant scoping)

**Configuration:** [DFile.backend/Program.cs](DFile.backend/Program.cs)
```csharp
// JWT validation, no issuer/audience validation
new TokenValidationParameters {
    ValidateIssuerSigningKey = true,
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtKey)),
    ValidateIssuer = false,
    ValidateAudience = false
}
```

---

## 9. API DTOs

### 9.1 Auth DTOs
**File:** [DFile.backend/DTOs/AuthDtos.cs](DFile.backend/DTOs/AuthDtos.cs)

```csharp
public class LoginDto { string Email, Password }
public class RegisterDto { string FirstName, LastName, Email, Password; int RoleTemplateId; int? TenantId }
public class UserResponseDto { int Id; string FirstName, LastName, Email, Role, RoleLabel; string? Avatar; string Status; int? TenantId; List<ModulePermissionDto>? Permissions }
public class ModulePermissionDto { string ModuleName; bool CanView, CanCreate, CanEdit, CanApprove, CanArchive }
```

### 9.2 Role Template DTOs
**File:** [DFile.backend/Controllers/RoleTemplatesController.cs](DFile.backend/Controllers/RoleTemplatesController.cs) (lines 208–245)

```csharp
public class CreateRoleTemplateDto { string Name; string? Description; List<PermissionDto>? Permissions }
public class PermissionDto { string ModuleName; bool CanView, CanCreate, CanEdit, CanApprove, CanArchive }
```

---

## 10. File Organization Summary

### Backend File Structure
```
DFile.backend/
├── Models/
│   ├── User.cs
│   ├── Tenant.cs
│   ├── Role.cs                       (Organizational designations)
│   ├── RoleTemplate.cs               (RBAC: System role blueprints)
│   ├── RolePermission.cs             (RBAC: Per-module permissions)
│   ├── TenantRole.cs                 (RBAC: Tenant-specific role instances)
│   ├── UserRoleAssignment.cs         (RBAC: User ↔ TenantRole mapping)
│   └── [20+ other models]
├── Controllers/
│   ├── AuthController.cs             (Login, Register, /me)
│   ├── RoleTemplatesController.cs    (Role template CRUD)
│   ├── RolesController.cs            (Organizational roles)
│   ├── TenantsController.cs          (Tenant CRUD)
│   ├── TenantAwareController.cs      (Base for tenant-scoped endpoints)
│   └── [15+ other controllers]
├── Authorization/
│   ├── RequirePermissionAttribute.cs
│   ├── PermissionAuthorizationFilter.cs
│   ├── ClaimsPrincipalExtensions.cs
│   └── RequirePermissionOrRolesAttribute.cs
├── Services/
│   ├── PermissionService.cs          (RBAC permission resolution)
│   ├── AuditService.cs               (Audit logging)
│   ├── INotificationService.cs
│   ├── IAuditService.cs
│   ├── ITenantContext.cs
│   └── [9+ other services]
├── Constants/
│   ├── UserRoleConstants.cs          (Role string constants)
│   └── ModuleRegistry.cs             (23 modules across 3 namespaces)
├── DTOs/
│   ├── AuthDtos.cs                   (Login, Register, UserResponse)
│   └── RoleTemplateDtos.cs           (role template creation/response)
├── Data/
│   └── AppDbContext.cs               (EF Core DbContext, 12 RBAC DbSets)
├── Migrations/
│   ├── 20260228160545_InitialCreate.cs
│   └── 20260323091128_SyncUserRoleFromRbacAssignments.cs
└── Program.cs                         (Middleware: UseStaticFiles, CORS, JWT, Auth, /api fallback)
```

### Frontend File Structure
```
DFile.frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── superadmin/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── tenant-oversight/page.tsx
│   │   ├── role-templates/
│   │   │   ├── page.tsx              (List role templates)
│   │   │   ├── create/page.tsx       (Create new template)
│   │   │   └── edit/page.tsx         (Edit template)
│   │   ├── audit-center/page.tsx
│   │   ├── risk-monitor/page.tsx
│   │   ├── platform-metrics/page.tsx
│   │   └── emergency-controls/page.tsx
│   ├── tenant/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── organization/page.tsx
│   │   ├── departments/page.tsx
│   │   ├── users/page.tsx            (User management & creation)
│   │   ├── roles/page.tsx            (Org. role designations)
│   │   ├── billing/page.tsx
│   │   ├── audit-logs/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── allocation/page.tsx
│   │   └── locations/page.tsx
│   ├── finance/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── assets/page.tsx
│   │   ├── depreciation/page.tsx
│   │   ├── disposals/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── maintenance-requests/page.tsx
│   │   ├── procurement-approvals/page.tsx
│   │   └── maintenance/page.tsx
│   ├── maintenance/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── schedules/page.tsx
│   │   ├── asset-condition/page.tsx
│   │   ├── work-orders/page.tsx
│   │   ├── parts-ready/page.tsx
│   │   └── repair-history/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── forbidden.tsx
│   └── global-error.tsx
├── components/
│   ├── app-shell.tsx                 (Main layout with nav)
│   ├── modals/
│   │   ├── add-employee-modal.tsx
│   │   ├── employee-details-modal.tsx
│   │   ├── change-role-modal.tsx
│   │   └── [22+ other modals]
│   ├── forms/
│   │   ├── tenant-registration-form.tsx
│   │   ├── add-asset-form.tsx
│   │   └── tenant-registration-wizard.tsx
│   ├── ui/
│   │   ├── button.tsx, input.tsx, dialog.tsx, etc. (shadcn/ui)
│   ├── notification-bell.tsx
│   ├── theme-toggle.tsx
│   ├── login-form.tsx
│   └── [10+ other components]
├── contexts/
│   ├── auth-context.tsx              (Auth state, login, logout)
│   └── maintenance-context.tsx
├── hooks/
│   ├── use-role-templates.ts         (Role template queries/mutations)
│   ├── use-organization.ts           (Employee, department, role management)
│   ├── use-permissions.ts            (Permission queries)
│   ├── use-tenants.ts                (Tenant management)
│   ├── use-assets.ts
│   ├── use-audit-logs.ts
│   ├── use-categories.ts
│   ├── use-maintenance.ts
│   ├── use-modules.ts
│   ├── use-notifications.ts
│   ├── use-procurement.ts
│   ├── use-rooms.ts
│   └── use-tasks.ts
├── lib/
│   ├── api.ts                        (Axios instance with JWT interceptor)
│   ├── api-base-url.ts               (NEXT_PUBLIC_API_URL resolution)
│   ├── role-routing.ts               (getDashboardPath, getRoleNamespace)
│   ├── nav-config.ts                 (Nav sections by role)
│   ├── route-permissions.ts          (Route → module mappings)
│   └── [utilities]
├── types/
│   ├── asset.ts                      (User, UserRole, Asset, etc.)
│   └── task.ts
└── [config files]
```

---

## 11. Key Features & Capabilities

### 11.1 Role & Permission Management (Super Admin)
- Create/edit/archive role templates with granular per-module permissions
- Assign roles to tenants with optional custom labels
- Sync permissions to all users assigned a role
- 5-minute permission cache (auto-invalidated on changes)

### 11.2 User Management (Tenant Admin & Super Admin)
- Create users with role assignment
- Assign multiple roles per user (OR-ed permissions)
- Archive/restore users
- View/filter users by department, role, status
- Change role/assignment dynamically

### 11.3 Tenant Onboarding (Super Admin)
- Create tenants with subscription plan (Starter, Basic, Pro)
- Plan-based feature limits (rooms, personnel, modules)
- Self-service tenant registration (`/api/tenants/register`)
- Subscription plan upgrade/downgrade

### 11.4 Audit & Compliance
- Full audit log of user actions (creation, edits, deletions)
- User role history tracked in `UserRoleAssignment.AssignedAt`
- Tenant-level audit logs viewable by tenant admins
- Platform-wide audit logs (Super Admin only)

---

## 12. Key Migrations

| Migration | File | Purpose |
|-----------|------|---------|
| InitialCreate (20260228160545) | [20260228160545_InitialCreate.cs](DFile.backend/Migrations/20260228160545_InitialCreate.cs) | Baseline schema: Users, Tenants, RoleTemplate, RolePermission, TenantRole, UserRoleAssignment tables |
| SyncUserRoleFromRbacAssignments (20260323091128) | [20260323091128_SyncUserRoleFromRbacAssignments.cs](DFile.backend/Migrations/20260323091128_SyncUserRoleFromRbacAssignments.cs) | Backfill `Users.Role` / `Users.RoleLabel` from primary `UserRoleAssignment` for JWT/policy alignment |

---

## 13. Frontend User Type Definition

**File:** [DFile.frontend/src/types/asset.ts](DFile.frontend/src/types/asset.ts)

```typescript
export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    roleLabel: string;
    avatar?: string;
    status: string;
    tenantId?: number;
    permissions?: ModulePermission[];
}

export type UserRole = 'Super Admin' | 'Admin' | 'Finance' | 'Maintenance';

export interface ModulePermission {
    moduleName: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canApprove: boolean;
    canArchive: boolean;
}
```

---

## 14. Summary: All Role-Related Files

### Backend
- **Models:** User.cs, Tenant.cs, Role.cs, RoleTemplate.cs, RolePermission.cs, TenantRole.cs, UserRoleAssignment.cs
- **Controllers:** AuthController.cs, RoleTemplatesController.cs, RolesController.cs, TenantsController.cs
- **Authorization:** RequirePermissionAttribute.cs, PermissionAuthorizationFilter.cs, ClaimsPrincipalExtensions.cs
- **Services:** PermissionService.cs, AuditService.cs, HttpTenantContext.cs
- **Constants:** UserRoleConstants.cs, ModuleRegistry.cs
- **DTOs:** AuthDtos.cs, RoleTemplateDtos.cs
- **Data:** AppDbContext.cs
- **Migrations:** 20260228160545_InitialCreate.cs, 20260323091128_SyncUserRoleFromRbacAssignments.cs
- **Config:** Program.cs

### Frontend
- **Routes:** superadmin/*, tenant/*, finance/*, maintenance/*, (auth)/*
- **Components:** app-shell.tsx, modals/* (add-employee, change-role, etc.), forms/*
- **Contexts:** auth-context.tsx
- **Hooks:** use-role-templates.ts, use-organization.ts, use-permissions.ts, use-tenants.ts
- **Types:** asset.ts (User, UserRole, ModulePermission)
- **Utilities:** role-routing.ts, nav-config.ts, api.ts, auth-context.tsx
- **Modals:** add-employee-modal.tsx, employee-details-modal.tsx, change-role-modal.tsx

---

## 15. Current Database Tables (RBAC-Related)

| Table | Primary Key | Foreign Keys | Indexes | Purpose |
|-------|-------------|--------------|---------|---------|
| `Users` | int (auto) | TenantId → Tenants | Email (unique), TenantId, Status | User accounts with role assignment |
| `Tenants` | int (auto) | — | — | Tenant organizations, subscription plans, feature limits |
| `RoleTemplates` | int (auto) | — | — | System role blueprints (system templates cannot be deleted) |
| `RolePermissions` | int (auto) | RoleTemplateId → RoleTemplates | (RoleTemplateId, ModuleName) unique | Per-module permission flags for roles |
| `TenantRoles` | int (auto) | TenantId → Tenants, RoleTemplateId → RoleTemplates | (TenantId, RoleTemplateId) unique | Tenant-specific role instances w/ custom labels |
| `UserRoleAssignments` | int (auto) | UserId → Users, TenantRoleId → TenantRoles | (UserId, TenantRoleId) unique | User ↔ TenantRole mapping |
| `Roles` | string (GUID) | DepartmentId → Departments, TenantId → Tenants | RoleCode (unique) | Organizational job designations (NOT RBAC) |

---

**Document Generated:** April 27, 2026  
**Completeness:** Comprehensive exploration of role/user models, RBAC implementation, admin interfaces, and tenant management architecture
