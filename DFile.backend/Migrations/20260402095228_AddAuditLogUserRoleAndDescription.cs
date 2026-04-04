using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogUserRoleAndDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.AuditLogs', 'Description') IS NULL
    ALTER TABLE [AuditLogs] ADD [Description] nvarchar(2000) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.AuditLogs', 'UserRole') IS NULL
    ALTER TABLE [AuditLogs] ADD [UserRole] nvarchar(128) NULL;
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_Tenant_UserRole' AND object_id = OBJECT_ID(N'dbo.AuditLogs'))
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Tenant_UserRole] ON [dbo].[AuditLogs] ([TenantId], [UserRole]);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_Tenant_UserRole",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserRole",
                table: "AuditLogs");
        }
    }
}
