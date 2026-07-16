using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialImpactTransactionTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MaintenanceSpendCost",
                table: "MaintenanceRecords",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FinancialImpactTransactions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MaintenanceRecordId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AssetId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FinanceDecision = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdjustmentValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    AddedLifeMonths = table.Column<int>(type: "int", nullable: true),
                    MaintenanceSpendCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PreviousPurchasePrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PreviousTotalLifeMonths = table.Column<int>(type: "int", nullable: false),
                    PreviousMonthlyDepreciation = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialImpactTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FinancialImpactTransactions_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FinancialImpactTransactions_MaintenanceRecords_MaintenanceRecordId",
                        column: x => x.MaintenanceRecordId,
                        principalTable: "MaintenanceRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FinancialImpactTransactions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FinancialImpactTransactions_Users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_FinancialImpactTransactions_ApprovedBy",
                table: "FinancialImpactTransactions",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialImpactTransactions_AssetId",
                table: "FinancialImpactTransactions",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialImpactTransactions_MaintenanceRecordId",
                table: "FinancialImpactTransactions",
                column: "MaintenanceRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialImpactTransactions_TenantId",
                table: "FinancialImpactTransactions",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FinancialImpactTransactions");

            migrationBuilder.DropColumn(
                name: "MaintenanceSpendCost",
                table: "MaintenanceRecords");
        }
    }
}
