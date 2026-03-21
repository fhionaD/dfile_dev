using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class RenameArchivedAndAddCodeChecks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Rename Archived → IsArchived ──────────────────────────
            migrationBuilder.RenameColumn(
                name: "Archived",
                table: "Tasks",
                newName: "IsArchived");

            migrationBuilder.RenameColumn(
                name: "Archived",
                table: "Employees",
                newName: "IsArchived");

            // ── CHECK constraints for code format enforcement ─────────
            // Pattern: PREFIX-NNNN (4+ digits). The '%' allows the
            // 5-digit fallback produced by RecordCodeGenerator.

            migrationBuilder.Sql(
                "ALTER TABLE [AssetCategories] ADD CONSTRAINT [CK_AssetCategories_CategoryCode] " +
                "CHECK ([CategoryCode] LIKE 'ACAT-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [Assets] ADD CONSTRAINT [CK_Assets_AssetCode] " +
                "CHECK ([AssetCode] LIKE 'AST-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [Employees] ADD CONSTRAINT [CK_Employees_EmployeeCode] " +
                "CHECK ([EmployeeCode] LIKE 'USR-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [Rooms] ADD CONSTRAINT [CK_Rooms_RoomCode] " +
                "CHECK ([RoomCode] LIKE 'RM-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [RoomCategories] ADD CONSTRAINT [CK_RoomCategories_RoomCategoryCode] " +
                "CHECK ([RoomCategoryCode] LIKE 'RMC-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [RoomSubCategories] ADD CONSTRAINT [CK_RoomSubCategories_SubCategoryCode] " +
                "CHECK ([SubCategoryCode] LIKE 'RSC-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [Departments] ADD CONSTRAINT [CK_Departments_DepartmentCode] " +
                "CHECK ([DepartmentCode] LIKE 'DPT-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [Roles] ADD CONSTRAINT [CK_Roles_RoleCode] " +
                "CHECK ([RoleCode] LIKE 'ROL-[0-9][0-9][0-9][0-9]%');");

            migrationBuilder.Sql(
                "ALTER TABLE [PurchaseOrders] ADD CONSTRAINT [CK_PurchaseOrders_OrderCode] " +
                "CHECK ([OrderCode] LIKE 'PO-[0-9][0-9][0-9][0-9]%');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── Drop CHECK constraints ────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE [AssetCategories] DROP CONSTRAINT IF EXISTS [CK_AssetCategories_CategoryCode];");
            migrationBuilder.Sql("ALTER TABLE [Assets] DROP CONSTRAINT IF EXISTS [CK_Assets_AssetCode];");
            migrationBuilder.Sql("ALTER TABLE [Employees] DROP CONSTRAINT IF EXISTS [CK_Employees_EmployeeCode];");
            migrationBuilder.Sql("ALTER TABLE [Rooms] DROP CONSTRAINT IF EXISTS [CK_Rooms_RoomCode];");
            migrationBuilder.Sql("ALTER TABLE [RoomCategories] DROP CONSTRAINT IF EXISTS [CK_RoomCategories_RoomCategoryCode];");
            migrationBuilder.Sql("ALTER TABLE [RoomSubCategories] DROP CONSTRAINT IF EXISTS [CK_RoomSubCategories_SubCategoryCode];");
            migrationBuilder.Sql("ALTER TABLE [Departments] DROP CONSTRAINT IF EXISTS [CK_Departments_DepartmentCode];");
            migrationBuilder.Sql("ALTER TABLE [Roles] DROP CONSTRAINT IF EXISTS [CK_Roles_RoleCode];");
            migrationBuilder.Sql("ALTER TABLE [PurchaseOrders] DROP CONSTRAINT IF EXISTS [CK_PurchaseOrders_OrderCode];");

            // ── Rename IsArchived → Archived ──────────────────────────
            migrationBuilder.RenameColumn(
                name: "IsArchived",
                table: "Tasks",
                newName: "Archived");

            migrationBuilder.RenameColumn(
                name: "IsArchived",
                table: "Employees",
                newName: "Archived");
        }
    }
}
