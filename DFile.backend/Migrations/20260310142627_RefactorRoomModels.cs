using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class RefactorRoomModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "RoomCategories");

            migrationBuilder.RenameColumn(
                name: "Archived",
                table: "Rooms",
                newName: "IsArchived");

            migrationBuilder.RenameColumn(
                name: "Archived",
                table: "RoomCategories",
                newName: "IsArchived");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Rooms",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "Rooms",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Rooms",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Rooms",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "UpdatedBy",
                table: "Rooms",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "RoomCategories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "RoomCategories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "RoomCategories",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "RoomCategories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "UpdatedBy",
                table: "RoomCategories",
                type: "int",
                nullable: true);

            // Backfill existing rows with current UTC timestamp
            migrationBuilder.Sql("UPDATE [Rooms] SET [CreatedAt] = GETUTCDATE(), [UpdatedAt] = GETUTCDATE() WHERE [CreatedAt] = '0001-01-01T00:00:00'");
            migrationBuilder.Sql("UPDATE [RoomCategories] SET [CreatedAt] = GETUTCDATE(), [UpdatedAt] = GETUTCDATE() WHERE [CreatedAt] = '0001-01-01T00:00:00'");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CreatedBy",
                table: "Rooms",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_IsArchived",
                table: "Rooms",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_UpdatedBy",
                table: "Rooms",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_RoomCategories_CreatedBy",
                table: "RoomCategories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_RoomCategories_IsArchived",
                table: "RoomCategories",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_RoomCategories_UpdatedBy",
                table: "RoomCategories",
                column: "UpdatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_RoomCategories_Users_CreatedBy",
                table: "RoomCategories",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RoomCategories_Users_UpdatedBy",
                table: "RoomCategories",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Users_CreatedBy",
                table: "Rooms",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Users_UpdatedBy",
                table: "Rooms",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoomCategories_Users_CreatedBy",
                table: "RoomCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_RoomCategories_Users_UpdatedBy",
                table: "RoomCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Users_CreatedBy",
                table: "Rooms");

            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Users_UpdatedBy",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_CreatedBy",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_IsArchived",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_UpdatedBy",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_CreatedBy",
                table: "RoomCategories");

            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_IsArchived",
                table: "RoomCategories");

            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_UpdatedBy",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "RoomCategories");

            migrationBuilder.RenameColumn(
                name: "IsArchived",
                table: "Rooms",
                newName: "Archived");

            migrationBuilder.RenameColumn(
                name: "IsArchived",
                table: "RoomCategories",
                newName: "Archived");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "RoomCategories",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
