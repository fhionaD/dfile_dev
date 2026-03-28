using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSalvageFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSalvageOverride",
                table: "Assets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "SalvagePercentage",
                table: "Assets",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SalvageValue",
                table: "Assets",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SalvagePercentage",
                table: "AssetCategories",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSalvageOverride",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "SalvagePercentage",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "SalvageValue",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "SalvagePercentage",
                table: "AssetCategories");
        }
    }
}
