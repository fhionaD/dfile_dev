using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetDepreciationMonthsApplied : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Assets', 'DepreciationMonthsApplied') IS NULL
    ALTER TABLE [Assets] ADD [DepreciationMonthsApplied] int NOT NULL CONSTRAINT [DF_Assets_DepreciationMonthsApplied_20260403] DEFAULT 0;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DepreciationMonthsApplied",
                table: "Assets");
        }
    }
}
