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
            // Idempotent: databases that already have these columns (manual/script changes) were failing
            // with "Column name ... specified more than once" when history was missing this migration.
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Assets', 'IsSalvageOverride') IS NULL
    ALTER TABLE [Assets] ADD [IsSalvageOverride] bit NOT NULL CONSTRAINT [DF_Assets_IsSalvageOverride_20260328] DEFAULT CAST(0 AS bit);
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Assets', 'SalvagePercentage') IS NULL
    ALTER TABLE [Assets] ADD [SalvagePercentage] decimal(5,2) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Assets', 'SalvageValue') IS NULL
    ALTER TABLE [Assets] ADD [SalvageValue] decimal(18,2) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.AssetCategories', 'SalvagePercentage') IS NULL
    ALTER TABLE [AssetCategories] ADD [SalvagePercentage] decimal(5,2) NOT NULL CONSTRAINT [DF_AssetCategories_SalvagePct_20260328] DEFAULT 0;
");
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
