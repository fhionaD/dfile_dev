using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class MaintenanceRecords_Tenant_IsArchived_CreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_Tenant_IsArchived_CreatedAt",
                table: "MaintenanceRecords",
                columns: new[] { "TenantId", "IsArchived", "CreatedAt" },
                descending: new[] { false, false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MaintenanceRecords_Tenant_IsArchived_CreatedAt",
                table: "MaintenanceRecords");
        }
    }
}
