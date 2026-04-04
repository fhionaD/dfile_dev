using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Core entities
        public DbSet<User> Users { get; set; }
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<Asset> Assets { get; set; }
        public DbSet<AssetCategory> AssetCategories { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<RoomCategory> RoomCategories { get; set; }
        public DbSet<RoomSubCategory> RoomSubCategories { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<Role> Roles { get; set; }

        // Role template / permission system
        public DbSet<RoleTemplate> RoleTemplates { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<TenantRole> TenantRoles { get; set; }
        public DbSet<UserRoleAssignment> UserRoleAssignments { get; set; }

        // Audit
        public DbSet<AuditLog> AuditLogs { get; set; }

        // Notifications
        public DbSet<Notification> Notifications { get; set; }

        // Allocations
        public DbSet<AssetAllocation> AssetAllocations { get; set; }

        // Asset Condition History
        public DbSet<AssetConditionLog> AssetConditionLogs { get; set; }

        // Per-user settings
        public DbSet<UserSettings> UserSettings { get; set; }

        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ── Asset ──────────────────────────────────────────────
            modelBuilder.Entity<Asset>(e =>
            {
                e.Property(a => a.AcquisitionCost).HasColumnType("decimal(18,2)");
                e.Property(a => a.PurchasePrice).HasColumnType("decimal(18,2)");
                e.Property(a => a.CurrentBookValue).HasColumnType("decimal(18,2)");
                e.Property(a => a.MonthlyDepreciation).HasColumnType("decimal(18,2)");
                e.Property(a => a.ResidualValue).HasColumnType("decimal(18,2)");
                e.Property(a => a.SalvagePercentage).HasColumnType("decimal(5,2)");
                e.Property(a => a.SalvageValue).HasColumnType("decimal(18,2)");
                e.Property(a => a.SerialNumber).HasMaxLength(450);

                e.Property(a => a.LifecycleStatus)
                    .HasConversion<int>()
                    .HasDefaultValue(LifecycleStatus.Registered);

                e.Property(a => a.CurrentCondition)
                    .HasConversion<int>()
                    .HasDefaultValue(AssetCondition.Good);

                e.HasIndex(a => a.AssetCode)
                    .IsUnique()
                    .HasDatabaseName("IX_Assets_AssetCode");

                e.HasIndex(a => new { a.TenantId, a.TagNumber })
                    .IsUnique()
                    .HasFilter("[TagNumber] IS NOT NULL")
                    .HasDatabaseName("IX_Assets_TenantId_TagNumber");

                e.HasIndex(a => new { a.TenantId, a.SerialNumber })
                    .IsUnique()
                    .HasFilter("[SerialNumber] IS NOT NULL")
                    .HasDatabaseName("IX_Assets_TenantId_SerialNumber");

                e.HasIndex(a => a.IsArchived)
                    .HasDatabaseName("IX_Assets_IsArchived");

                e.HasIndex(a => a.CreatedAt)
                    .HasDatabaseName("IX_Assets_CreatedAt");

                e.HasIndex(a => a.LifecycleStatus)
                    .HasDatabaseName("IX_Assets_LifecycleStatus");

                e.HasOne(a => a.Category)
                    .WithMany()
                    .HasForeignKey(a => a.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(a => a.Tenant)
                    .WithMany()
                    .HasForeignKey(a => a.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(a => a.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(a => a.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(a => a.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(a => a.UpdatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(a => a.PurchaseOrder)
                    .WithMany()
                    .HasForeignKey(a => a.PurchaseOrderId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasIndex(a => a.PurchaseOrderId)
                    .HasDatabaseName("IX_Assets_PurchaseOrderId");
            });

            // ── AssetCategory ──────────────────────────────────────
            modelBuilder.Entity<AssetCategory>(e =>
            {
                e.Property(c => c.SalvagePercentage).HasColumnType("decimal(5,2)");

                e.Property(c => c.HandlingType)
                    .HasConversion<int>()
                    .HasDefaultValue(HandlingType.Fixed);

                e.HasIndex(c => c.AssetCategoryCode)
                    .IsUnique()
                    .HasDatabaseName("IX_AssetCategories_AssetCategoryCode");

                e.HasIndex(c => new { c.CategoryName, c.HandlingType, c.TenantId })
                    .IsUnique()
                    .HasFilter("[IsArchived] = 0")
                    .HasDatabaseName("IX_AssetCategories_Name_HandlingType_Tenant");

                e.HasIndex(c => c.IsArchived)
                    .HasDatabaseName("IX_AssetCategories_IsArchived");

                e.HasOne(c => c.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(c => c.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(c => c.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(c => c.UpdatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                // DisplayLabel is a computed C# property, not mapped to DB
                e.Ignore(c => c.DisplayLabel);
            });

            // ── MaintenanceRecord ──────────────────────────────────
            modelBuilder.Entity<MaintenanceRecord>(e =>
            {
                e.Property(m => m.Cost).HasColumnType("decimal(18,2)");

                e.HasIndex(m => new { m.TenantId, m.Status, m.IsArchived })
                    .HasDatabaseName("IX_MaintenanceRecords_Tenant_Status_Archived");

                e.HasIndex(m => m.AssetId)
                    .HasDatabaseName("IX_MaintenanceRecords_AssetId");

                e.HasIndex(m => m.EndDate)
                    .HasDatabaseName("IX_MaintenanceRecords_EndDate");

                // Speeds tenant dashboard list: WHERE TenantId = @t AND IsArchived = 0 ORDER BY CreatedAt DESC
                e.HasIndex(m => new { m.TenantId, m.IsArchived, m.CreatedAt })
                    .IsDescending(false, false, true)
                    .HasDatabaseName("IX_MaintenanceRecords_Tenant_IsArchived_CreatedAt");

                e.HasOne(m => m.Asset)
                    .WithMany()
                    .HasForeignKey(m => m.AssetId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(m => m.Tenant)
                    .WithMany()
                    .HasForeignKey(m => m.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── Room ───────────────────────────────────────────────
            modelBuilder.Entity<Room>(e =>
            {
                e.HasOne(r => r.RoomCategory)
                    .WithMany()
                    .HasForeignKey(r => r.CategoryId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasOne(r => r.RoomSubCategory)
                    .WithMany()
                    .HasForeignKey(r => r.SubCategoryId)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(r => r.Tenant)
                    .WithMany()
                    .HasForeignKey(r => r.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(r => r.RoomCode)
                    .IsUnique()
                    .HasDatabaseName("IX_Rooms_RoomCode");

                e.HasIndex(r => new { r.Name, r.Floor, r.TenantId })
                    .IsUnique()
                    .HasFilter("[IsArchived] = 0")
                    .HasDatabaseName("IX_Rooms_Name_Floor_Tenant");

                e.HasIndex(r => r.IsArchived)
                    .HasDatabaseName("IX_Rooms_IsArchived");

                e.HasOne(r => r.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(r => r.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(r => r.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(r => r.UpdatedBy)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ── RoomCategory ───────────────────────────────────────
            modelBuilder.Entity<RoomCategory>(e =>
            {
                e.HasIndex(r => r.RoomCategoryCode)
                    .IsUnique()
                    .HasDatabaseName("IX_RoomCategories_RoomCategoryCode");

                e.HasIndex(r => new { r.Name, r.TenantId })
                    .IsUnique()
                    .HasFilter("[IsArchived] = 0")
                    .HasDatabaseName("IX_RoomCategories_Name_Tenant");

                e.HasIndex(r => r.IsArchived)
                    .HasDatabaseName("IX_RoomCategories_IsArchived");

                e.HasOne(r => r.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(r => r.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(r => r.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(r => r.UpdatedBy)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ── RoomSubCategory ────────────────────────────────────
            modelBuilder.Entity<RoomSubCategory>(e =>
            {
                e.HasIndex(s => s.SubCategoryCode)
                    .IsUnique()
                    .HasDatabaseName("IX_RoomSubCategories_SubCategoryCode");

                e.HasIndex(s => new { s.RoomCategoryId, s.Name, s.TenantId })
                    .IsUnique()
                    .HasFilter("[IsArchived] = 0")
                    .HasDatabaseName("IX_RoomSubCategories_Category_Name_Tenant");

                e.HasIndex(s => s.IsArchived)
                    .HasDatabaseName("IX_RoomSubCategories_IsArchived");

                e.HasOne(s => s.RoomCategory)
                    .WithMany()
                    .HasForeignKey(s => s.RoomCategoryId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(s => s.Tenant)
                    .WithMany()
                    .HasForeignKey(s => s.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(s => s.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(s => s.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(s => s.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(s => s.UpdatedBy)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ── PurchaseOrder ──────────────────────────────────────
            modelBuilder.Entity<PurchaseOrder>(e =>
            {
                e.Property(p => p.PurchasePrice).HasColumnType("decimal(18,2)");

                e.HasIndex(p => p.OrderCode)
                    .IsUnique()
                    .HasDatabaseName("IX_PurchaseOrders_OrderCode");

                e.HasIndex(p => new { p.TenantId, p.Status, p.IsArchived })
                    .HasDatabaseName("IX_PurchaseOrders_Tenant_Status_Archived");

                e.HasOne(p => p.Tenant)
                    .WithMany()
                    .HasForeignKey(p => p.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(p => p.ApprovedByUser)
                    .WithMany()
                    .HasForeignKey(p => p.ApprovedBy)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ── PurchaseOrderItem ──────────────────────────────────
            modelBuilder.Entity<PurchaseOrderItem>(e =>
            {
                e.Property(i => i.UnitCost).HasColumnType("decimal(18,2)");
                e.Property(i => i.TotalCost).HasColumnType("decimal(18,2)");

                e.HasOne(i => i.PurchaseOrder)
                    .WithMany(po => po.Items)
                    .HasForeignKey(i => i.PurchaseOrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(i => i.Category)
                    .WithMany()
                    .HasForeignKey(i => i.CategoryId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // ── Employee ───────────────────────────────────────────
            modelBuilder.Entity<Employee>(e =>
            {
                e.HasIndex(emp => emp.EmployeeCode)
                    .IsUnique()
                    .HasDatabaseName("IX_Employees_EmployeeCode");

                e.HasIndex(emp => emp.TenantId)
                    .HasDatabaseName("IX_Employees_TenantId");

                e.HasIndex(emp => emp.Email)
                    .HasDatabaseName("IX_Employees_Email");

                e.HasOne(emp => emp.Tenant)
                    .WithMany()
                    .HasForeignKey(emp => emp.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── Department ─────────────────────────────────────────
            modelBuilder.Entity<Department>(e =>
            {
                e.HasIndex(d => d.DepartmentCode)
                    .IsUnique()
                    .HasDatabaseName("IX_Departments_DepartmentCode");

                e.HasOne(d => d.Tenant)
                    .WithMany()
                    .HasForeignKey(d => d.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(d => d.ParentDepartment)
                    .WithMany()
                    .HasForeignKey(d => d.ParentDepartmentId)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(d => d.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(d => d.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(d => d.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(d => d.UpdatedBy)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ── Role ───────────────────────────────────────────────
            modelBuilder.Entity<Role>(e =>
            {
                e.HasIndex(r => r.RoleCode)
                    .IsUnique()
                    .HasDatabaseName("IX_Roles_RoleCode");

                e.HasOne(r => r.Department)
                    .WithMany()
                    .HasForeignKey(r => r.DepartmentId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasOne(r => r.Tenant)
                    .WithMany()
                    .HasForeignKey(r => r.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── TaskItem ───────────────────────────────────────────
            modelBuilder.Entity<TaskItem>(e =>
            {
                e.HasIndex(t => t.TenantId)
                    .HasDatabaseName("IX_Tasks_TenantId");

                e.HasIndex(t => new { t.TenantId, t.Status, t.IsArchived })
                    .HasDatabaseName("IX_Tasks_Tenant_Status_Archived");

                e.HasOne(t => t.Tenant)
                    .WithMany()
                    .HasForeignKey(t => t.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── User ───────────────────────────────────────────────
            modelBuilder.Entity<User>(e =>
            {
                e.HasIndex(u => u.Email)
                    .IsUnique()
                    .HasDatabaseName("IX_Users_Email");

                e.HasIndex(u => u.TenantId)
                    .HasDatabaseName("IX_Users_TenantId");

                e.HasIndex(u => u.Status)
                    .HasDatabaseName("IX_Users_Status");

                e.HasOne(u => u.Tenant)
                    .WithMany()
                    .HasForeignKey(u => u.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── RoleTemplate / Permission system ───────────────────
            modelBuilder.Entity<RolePermission>(e =>
            {
                e.HasOne(rp => rp.RoleTemplate)
                    .WithMany(rt => rt.Permissions)
                    .HasForeignKey(rp => rp.RoleTemplateId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasIndex(rp => new { rp.RoleTemplateId, rp.ModuleName })
                    .IsUnique()
                    .HasDatabaseName("IX_RolePermissions_Template_Module");
            });

            modelBuilder.Entity<TenantRole>(e =>
            {
                e.HasOne(tr => tr.Tenant)
                    .WithMany()
                    .HasForeignKey(tr => tr.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(tr => tr.RoleTemplate)
                    .WithMany(rt => rt.TenantRoles)
                    .HasForeignKey(tr => tr.RoleTemplateId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(tr => new { tr.TenantId, tr.RoleTemplateId })
                    .IsUnique()
                    .HasDatabaseName("IX_TenantRoles_Tenant_Template");
            });

            modelBuilder.Entity<UserRoleAssignment>(e =>
            {
                e.HasOne(ura => ura.User)
                    .WithMany()
                    .HasForeignKey(ura => ura.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(ura => ura.TenantRole)
                    .WithMany(tr => tr.UserAssignments)
                    .HasForeignKey(ura => ura.TenantRoleId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(ura => new { ura.UserId, ura.TenantRoleId })
                    .IsUnique()
                    .HasDatabaseName("IX_UserRoleAssignment_User_TenantRole");
            });

            // ── AuditLog ───────────────────────────────────────────
            modelBuilder.Entity<AuditLog>(e =>
            {
                e.Property(a => a.Description).HasMaxLength(2000);
                e.Property(a => a.UserRole).HasMaxLength(128);

                e.HasIndex(a => a.CreatedAt)
                    .HasDatabaseName("IX_AuditLogs_CreatedAt");

                e.HasIndex(a => new { a.TenantId, a.EntityType })
                    .HasDatabaseName("IX_AuditLogs_Tenant_Entity");

                e.HasIndex(a => new { a.TenantId, a.UserRole })
                    .HasDatabaseName("IX_AuditLogs_Tenant_UserRole");

                e.HasOne(a => a.User)
                    .WithMany()
                    .HasForeignKey(a => a.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasOne(a => a.Tenant)
                    .WithMany()
                    .HasForeignKey(a => a.TenantId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // ── Notification ──────────────────────────────────────
            modelBuilder.Entity<Notification>(e =>
            {
                e.HasIndex(n => new { n.TenantId, n.IsRead, n.CreatedAt })
                    .HasDatabaseName("IX_Notifications_Tenant_Read_Created");

                e.HasIndex(n => new { n.UserId, n.IsRead })
                    .HasDatabaseName("IX_Notifications_User_Read");

                e.HasOne(n => n.User)
                    .WithMany()
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(n => n.Tenant)
                    .WithMany()
                    .HasForeignKey(n => n.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ── AssetAllocation ────────────────────────────────────
            modelBuilder.Entity<AssetAllocation>(e =>
            {
                e.HasIndex(a => new { a.AssetId, a.Status })
                    .HasDatabaseName("IX_AssetAllocations_Asset_Status");

                e.HasIndex(a => a.RoomId)
                    .HasDatabaseName("IX_AssetAllocations_RoomId");

                e.HasIndex(a => a.AllocatedAt)
                    .HasDatabaseName("IX_AssetAllocations_AllocatedAt");

                e.HasOne(a => a.Asset)
                    .WithMany()
                    .HasForeignKey(a => a.AssetId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(a => a.Room)
                    .WithMany()
                    .HasForeignKey(a => a.RoomId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(a => a.AllocatedByUser)
                    .WithMany()
                    .HasForeignKey(a => a.AllocatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasOne(a => a.Tenant)
                    .WithMany()
                    .HasForeignKey(a => a.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            // ── UserSettings ──────────────────────────────────────
            modelBuilder.Entity<UserSettings>(e =>
            {
                e.HasIndex(s => s.UserId)
                    .IsUnique()
                    .HasDatabaseName("IX_UserSettings_UserId");

                e.HasOne(s => s.User)
                    .WithMany()
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ── PaymentTransaction ─────────────────────────────────
            modelBuilder.Entity<PaymentTransaction>(e =>
            {
                e.Property(p => p.AmountCents);
                e.Property(p => p.SubscriptionPlanCode).HasMaxLength(32);
                e.HasIndex(p => p.ReferenceNumber)
                    .IsUnique()
                    .HasDatabaseName("IX_PaymentTransactions_ReferenceNumber");
                e.HasIndex(p => p.CheckoutSessionId)
                    .HasDatabaseName("IX_PaymentTransactions_CheckoutSessionId");
                e.HasIndex(p => new { p.TenantId, p.Status })
                    .HasDatabaseName("IX_PaymentTransactions_Tenant_Status");
                e.HasOne(p => p.Tenant)
                    .WithMany()
                    .HasForeignKey(p => p.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── AssetConditionLog ─────────────────────────────────
            modelBuilder.Entity<AssetConditionLog>(e =>
            {
                e.Property(l => l.PreviousCondition)
                    .HasConversion<int>();
                e.Property(l => l.NewCondition)
                    .HasConversion<int>();

                e.HasIndex(l => new { l.AssetId, l.CreatedAt })
                    .HasDatabaseName("IX_AssetConditionLogs_Asset_Created");

                e.HasOne(l => l.Asset)
                    .WithMany()
                    .HasForeignKey(l => l.AssetId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(l => l.Tenant)
                    .WithMany()
                    .HasForeignKey(l => l.TenantId)
                    .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
