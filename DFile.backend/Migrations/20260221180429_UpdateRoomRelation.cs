using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRoomRelation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RoomCategoryId",
                table: "Rooms",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_RoomCategoryId",
                table: "Rooms",
                column: "RoomCategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_RoomCategories_RoomCategoryId",
                table: "Rooms",
                column: "RoomCategoryId",
                principalTable: "RoomCategories",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_RoomCategories_RoomCategoryId",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_RoomCategoryId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "RoomCategoryId",
                table: "Rooms");
        }
    }
}
