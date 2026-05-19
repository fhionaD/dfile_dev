using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRepairTypeAndFinanceDecisionToMaintenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AddedLifeMonths",
                table: "MaintenanceRecords",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AdjustmentValue",
                table: "MaintenanceRecords",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "MaintenanceRecords",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "MaintenanceRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FinanceDecision",
                table: "MaintenanceRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepairType",
                table: "MaintenanceRecords",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddedLifeMonths",
                table: "MaintenanceRecords");

            migrationBuilder.DropColumn(
                name: "AdjustmentValue",
                table: "MaintenanceRecords");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "MaintenanceRecords");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "MaintenanceRecords");

            migrationBuilder.DropColumn(
                name: "FinanceDecision",
                table: "MaintenanceRecords");

            migrationBuilder.DropColumn(
                name: "RepairType",
                table: "MaintenanceRecords");
        }
    }
}
