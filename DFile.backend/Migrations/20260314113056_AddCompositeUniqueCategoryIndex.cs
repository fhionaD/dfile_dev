using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCompositeUniqueCategoryIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_Name",
                table: "AssetCategories");

            migrationBuilder.CreateIndex(
                name: "IX_AssetCategories_Name_HandlingType_Tenant",
                table: "AssetCategories",
                columns: new[] { "Name", "HandlingType", "TenantId" },
                unique: true,
                filter: "[IsArchived] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_Name_HandlingType_Tenant",
                table: "AssetCategories");

            migrationBuilder.CreateIndex(
                name: "IX_AssetCategories_Name",
                table: "AssetCategories",
                column: "Name");
        }
    }
}
