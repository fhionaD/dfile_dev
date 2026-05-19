using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class DropOrphanedTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Drop EF-tracked UserSettings table ───────────────────────────────
            migrationBuilder.DropTable(
                name: "UserSettings");

            // ── Drop orphaned FK columns on active tables ────────────────────────
            // MaintenanceRecords.MaintenanceTicketId (FK to orphaned MaintenanceTickets)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MaintenanceRecords_MaintenanceTickets_MaintenanceTicketId')
                    ALTER TABLE [MaintenanceRecords] DROP CONSTRAINT [FK_MaintenanceRecords_MaintenanceTickets_MaintenanceTicketId]
            ");
            migrationBuilder.Sql("DROP INDEX IF EXISTS [IX_MaintenanceRecords_MaintenanceTicketId] ON [MaintenanceRecords]");
            migrationBuilder.Sql(@"
                IF COL_LENGTH('MaintenanceRecords','MaintenanceTicketId') IS NOT NULL
                    ALTER TABLE [MaintenanceRecords] DROP COLUMN [MaintenanceTicketId]
            ");

            // PurchaseOrders.WorkRequestId (FK to orphaned WorkRequests)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PurchaseOrders_WorkRequests_WorkRequestId')
                    ALTER TABLE [PurchaseOrders] DROP CONSTRAINT [FK_PurchaseOrders_WorkRequests_WorkRequestId]
            ");
            migrationBuilder.Sql("DROP INDEX IF EXISTS [IX_PurchaseOrders_WorkRequestId] ON [PurchaseOrders]");
            migrationBuilder.Sql(@"
                IF COL_LENGTH('PurchaseOrders','WorkRequestId') IS NOT NULL
                    ALTER TABLE [PurchaseOrders] DROP COLUMN [WorkRequestId]
            ");

            // ── Drop orphaned tables (dependency order) ──────────────────────────
            // MaintenanceRepairs depends on MaintenanceTickets and MaintenanceRecords
            migrationBuilder.Sql("IF OBJECT_ID('dbo.MaintenanceRepairs','U') IS NOT NULL DROP TABLE [MaintenanceRepairs]");

            // WorkRequests depends on MaintenanceRecords, Assets, Users
            migrationBuilder.Sql("IF OBJECT_ID('dbo.WorkRequests','U') IS NOT NULL DROP TABLE [WorkRequests]");

            // Roles depends on Departments
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Roles_Departments_DepartmentId')
                    ALTER TABLE [Roles] DROP CONSTRAINT [FK_Roles_Departments_DepartmentId]
            ");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.Roles','U') IS NOT NULL DROP TABLE [Roles]");

            // MaintenanceTickets (MaintenanceRepairs already gone)
            migrationBuilder.Sql("IF OBJECT_ID('dbo.MaintenanceTickets','U') IS NOT NULL DROP TABLE [MaintenanceTickets]");

            // Departments (Roles already gone; self-referencing FK dropped first)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Departments_Departments_ParentDepartmentId')
                    ALTER TABLE [Departments] DROP CONSTRAINT [FK_Departments_Departments_ParentDepartmentId]
            ");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.Departments','U') IS NOT NULL DROP TABLE [Departments]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    EnableAnimations = table.Column<bool>(type: "bit", nullable: false),
                    EnableAutoCost = table.Column<bool>(type: "bit", nullable: false),
                    EnableBatchOperations = table.Column<bool>(type: "bit", nullable: false),
                    EnableDataCaching = table.Column<bool>(type: "bit", nullable: false),
                    EnableGlassmorphism = table.Column<bool>(type: "bit", nullable: false),
                    EnableGlint = table.Column<bool>(type: "bit", nullable: false),
                    EnableMinimalUI = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserSettings_UserId",
                table: "UserSettings",
                column: "UserId",
                unique: true);
        }
    }
}
