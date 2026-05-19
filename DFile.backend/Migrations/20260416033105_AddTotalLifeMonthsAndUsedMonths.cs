using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTotalLifeMonthsAndUsedMonths : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsefulLifeYears",
                table: "PurchaseOrders");

            migrationBuilder.RenameColumn(
                name: "UsefulLifeYears",
                table: "Assets",
                newName: "AccumulatedDepreciation");

            migrationBuilder.AddColumn<int>(
                name: "UsefulLifeMonths",
                table: "PurchaseOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalLifeMonths",
                table: "Assets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UsedMonths",
                table: "Assets",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsefulLifeMonths",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "TotalLifeMonths",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "UsedMonths",
                table: "Assets");

            migrationBuilder.RenameColumn(
                name: "AccumulatedDepreciation",
                table: "Assets",
                newName: "UsefulLifeYears");

            migrationBuilder.AddColumn<decimal>(
                name: "UsefulLifeYears",
                table: "PurchaseOrders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
