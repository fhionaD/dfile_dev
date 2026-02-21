using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class MakeCategoryIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_RoomCategories_CategoryId",
                table: "Rooms");

            migrationBuilder.AlterColumn<string>(
                name: "CategoryId",
                table: "Rooms",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_RoomCategories_CategoryId",
                table: "Rooms",
                column: "CategoryId",
                principalTable: "RoomCategories",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_RoomCategories_CategoryId",
                table: "Rooms");

            migrationBuilder.AlterColumn<string>(
                name: "CategoryId",
                table: "Rooms",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_RoomCategories_CategoryId",
                table: "Rooms",
                column: "CategoryId",
                principalTable: "RoomCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
