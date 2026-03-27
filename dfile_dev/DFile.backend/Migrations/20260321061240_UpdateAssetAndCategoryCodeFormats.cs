using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAssetAndCategoryCodeFormats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop the old CHECK constraint that enforces ACAT- prefix
            migrationBuilder.Sql(
                "ALTER TABLE [AssetCategories] DROP CONSTRAINT IF EXISTS [CK_AssetCategories_CategoryCode];"
            );

            // 2. Rename existing ACAT- prefixed category codes to ASTC-
            migrationBuilder.Sql(
                "UPDATE [AssetCategories] SET [CategoryCode] = REPLACE([CategoryCode], 'ACAT-', 'ASTC-') WHERE [CategoryCode] LIKE 'ACAT-%';"
            );

            // 3. Recreate the CHECK constraint with the new ASTC- prefix
            migrationBuilder.Sql(
                "ALTER TABLE [AssetCategories] ADD CONSTRAINT [CK_AssetCategories_CategoryCode] " +
                "CHECK ([CategoryCode] LIKE 'ASTC-[0-9][0-9][0-9][0-9]%');"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Drop the ASTC- CHECK constraint
            migrationBuilder.Sql(
                "ALTER TABLE [AssetCategories] DROP CONSTRAINT IF EXISTS [CK_AssetCategories_CategoryCode];"
            );

            // 2. Revert ASTC- back to ACAT-
            migrationBuilder.Sql(
                "UPDATE [AssetCategories] SET [CategoryCode] = REPLACE([CategoryCode], 'ASTC-', 'ACAT-') WHERE [CategoryCode] LIKE 'ASTC-%';"
            );

            // 3. Recreate the CHECK constraint with the old ACAT- prefix
            migrationBuilder.Sql(
                "ALTER TABLE [AssetCategories] ADD CONSTRAINT [CK_AssetCategories_CategoryCode] " +
                "CHECK ([CategoryCode] LIKE 'ACAT-[0-9][0-9][0-9][0-9]%');"
            );
        }
    }
}
