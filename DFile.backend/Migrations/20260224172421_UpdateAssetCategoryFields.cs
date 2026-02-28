using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAssetCategoryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "AssetCategories",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArchivedBy",
                table: "AssetCategories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "AssetCategories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "AssetCategories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandlingType",
                table: "AssetCategories",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "AssetCategories",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "AssetCategories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "AssetCategories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "AssetCategories",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "ArchivedBy",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "HandlingType",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "AssetCategories");
        }
    }
}
