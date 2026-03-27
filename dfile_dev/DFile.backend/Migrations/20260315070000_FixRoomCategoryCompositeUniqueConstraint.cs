using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class FixRoomCategoryCompositeUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old unique index on Name + TenantId only
            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_Name_Tenant",
                table: "RoomCategories");

            // Alter SubCategory from nvarchar(max) to nvarchar(450) so it can participate in index
            migrationBuilder.AlterColumn<string>(
                name: "SubCategory",
                table: "RoomCategories",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            // Create new composite unique index on Name + SubCategory + TenantId
            migrationBuilder.CreateIndex(
                name: "IX_RoomCategories_Name_SubCategory_Tenant",
                table: "RoomCategories",
                columns: new[] { "Name", "SubCategory", "TenantId" },
                unique: true,
                filter: "[IsArchived] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop composite unique index
            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_Name_SubCategory_Tenant",
                table: "RoomCategories");

            // Revert SubCategory back to nvarchar(max)
            migrationBuilder.AlterColumn<string>(
                name: "SubCategory",
                table: "RoomCategories",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450);

            // Restore old unique index on Name + TenantId
            migrationBuilder.CreateIndex(
                name: "IX_RoomCategories_Name_Tenant",
                table: "RoomCategories",
                columns: new[] { "Name", "TenantId" },
                unique: true,
                filter: "[IsArchived] = 0");
        }
    }
}
