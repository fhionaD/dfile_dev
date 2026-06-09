using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogIpAddressAndUserAgent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add IpAddress column if it does not already exist
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.AuditLogs', 'IpAddress') IS NULL
    ALTER TABLE [AuditLogs] ADD [IpAddress] nvarchar(max) NULL;
");

            // Add UserAgent column if it does not already exist
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.AuditLogs', 'UserAgent') IS NULL
    ALTER TABLE [AuditLogs] ADD [UserAgent] nvarchar(max) NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "AuditLogs");
        }
    }
}
