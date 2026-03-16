using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class FixArchivedAssetStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssetCategories_Users_CreatedBy",
                table: "AssetCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_AssetCategories_Users_UpdatedBy",
                table: "AssetCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_CreatedBy",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_UpdatedBy",
                table: "Assets");

            migrationBuilder.AddForeignKey(
                name: "FK_AssetCategories_Users_CreatedBy",
                table: "AssetCategories",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AssetCategories_Users_UpdatedBy",
                table: "AssetCategories",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_CreatedBy",
                table: "Assets",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_UpdatedBy",
                table: "Assets",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id");

            // Data fix: set archived assets to AssetStatus = 4 (Disposed)
            migrationBuilder.Sql("UPDATE [Assets] SET [AssetStatus] = 4 WHERE [IsArchived] = 1 AND [AssetStatus] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssetCategories_Users_CreatedBy",
                table: "AssetCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_AssetCategories_Users_UpdatedBy",
                table: "AssetCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_CreatedBy",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_UpdatedBy",
                table: "Assets");

            migrationBuilder.AddForeignKey(
                name: "FK_AssetCategories_Users_CreatedBy",
                table: "AssetCategories",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AssetCategories_Users_UpdatedBy",
                table: "AssetCategories",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_CreatedBy",
                table: "Assets",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_UpdatedBy",
                table: "Assets",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
