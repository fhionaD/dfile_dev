using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class CleanupRoomAndCategoryColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Rooms: Drop UnitId, Status, MaxOccupancy ──────────────────────
            migrationBuilder.DropColumn(name: "UnitId", table: "Rooms");
            migrationBuilder.DropColumn(name: "Status", table: "Rooms");
            migrationBuilder.DropColumn(name: "MaxOccupancy", table: "Rooms");

            // ── RoomCategories: Drop MaxOccupancy ─────────────────────────────
            migrationBuilder.DropColumn(name: "MaxOccupancy", table: "RoomCategories");

            // ── AssetCategories: Rename index (column stays as CategoryCode) ──
            migrationBuilder.RenameIndex(
                name: "IX_AssetCategories_CategoryCode",
                table: "AssetCategories",
                newName: "IX_AssetCategories_AssetCategoryCode");

            // ── AssetAllocations: Remove DefaultValue from Status ─────────────
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AssetAllocations",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Active");

            // ── AssetAllocations: PreviousRoomId nvarchar(450)→nvarchar(max) ──
            migrationBuilder.AlterColumn<string>(
                name: "PreviousRoomId",
                table: "AssetAllocations",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── AssetAllocations: Revert PreviousRoomId ───────────────────────
            migrationBuilder.AlterColumn<string>(
                name: "PreviousRoomId",
                table: "AssetAllocations",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            // ── AssetAllocations: Restore DefaultValue on Status ──────────────
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AssetAllocations",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Active",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            // ── AssetCategories: Revert index rename ──────────────────────────
            migrationBuilder.RenameIndex(
                name: "IX_AssetCategories_AssetCategoryCode",
                table: "AssetCategories",
                newName: "IX_AssetCategories_CategoryCode");

            // ── RoomCategories: Re-add MaxOccupancy ───────────────────────────
            migrationBuilder.AddColumn<int>(
                name: "MaxOccupancy",
                table: "RoomCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // ── Rooms: Re-add UnitId, Status, MaxOccupancy ────────────────────
            migrationBuilder.AddColumn<int>(
                name: "MaxOccupancy",
                table: "Rooms",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Available");

            migrationBuilder.AddColumn<string>(
                name: "UnitId",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
