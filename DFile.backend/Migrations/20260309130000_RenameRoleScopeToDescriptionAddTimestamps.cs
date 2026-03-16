using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class RenameRoleScopeToDescriptionAddTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Rename Scope → Description on Roles table
            migrationBuilder.RenameColumn(
                name: "Scope",
                table: "Roles",
                newName: "Description");

            // 2. Drop the Departments.Scope column added in the previous migration
            //    (we now use the existing Description column on Departments instead)
            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Departments");

            // 3. Add CreatedAt to Roles (default to current time for existing rows)
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Roles",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            // 4. Add EditedAt to Roles (nullable)
            migrationBuilder.AddColumn<DateTime>(
                name: "EditedAt",
                table: "Roles",
                type: "datetime2",
                nullable: true);

            // 5. Add CreatedAt to Departments (default to current time for existing rows)
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Departments",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            // 6. Add EditedAt to Departments (nullable)
            migrationBuilder.AddColumn<DateTime>(
                name: "EditedAt",
                table: "Departments",
                type: "datetime2",
                nullable: true);

            // 7. Backfill departments.Description from linked role descriptions
            //    where the department currently has an empty description
            migrationBuilder.Sql(@"
                UPDATE d
                SET d.Description = r.Description,
                    d.EditedAt = GETUTCDATE()
                FROM Departments d
                INNER JOIN Roles r ON r.DepartmentId = d.Id
                WHERE (d.Description IS NULL OR d.Description = '')
                  AND r.Description IS NOT NULL
                  AND r.Description != ''
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EditedAt", table: "Roles");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Roles");
            migrationBuilder.DropColumn(name: "EditedAt", table: "Departments");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Departments");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Roles",
                newName: "Scope");

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
