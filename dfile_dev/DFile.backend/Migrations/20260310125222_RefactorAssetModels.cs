using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class RefactorAssetModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_AssetCategories_CategoryId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "AssetCategories");

            migrationBuilder.RenameColumn(
                name: "Archived",
                table: "Assets",
                newName: "IsArchived");

            migrationBuilder.RenameColumn(
                name: "Archived",
                table: "AssetCategories",
                newName: "IsArchived");

            migrationBuilder.AddColumn<string>(
                name: "Module",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: true);

            // Safety: assign orphaned assets (NULL CategoryId) to the first available category in the same tenant
            migrationBuilder.Sql(@"
                UPDATE a SET a.[CategoryId] = (
                    SELECT TOP 1 c.[Id] FROM [AssetCategories] c WHERE c.[TenantId] = a.[TenantId] AND c.[IsArchived] = 0
                )
                FROM [Assets] a
                WHERE a.[CategoryId] IS NULL
                  AND EXISTS (SELECT 1 FROM [AssetCategories] c2 WHERE c2.[TenantId] = a.[TenantId] AND c2.[IsArchived] = 0);

                DELETE FROM [Assets] WHERE [CategoryId] IS NULL;
            ");

            migrationBuilder.AlterColumn<string>(
                name: "CategoryId",
                table: "Assets",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AssetStatus",
                table: "Assets",
                type: "int",
                nullable: false,
                defaultValue: 1);

            // Set existing assets to AssetStatus = 1 (Available) 
            migrationBuilder.Sql("UPDATE [Assets] SET [AssetStatus] = 1 WHERE [AssetStatus] = 0");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Assets",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "Assets",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandlingTypeSnapshot",
                table: "Assets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Assets",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Assets",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "UpdatedBy",
                table: "Assets",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "AssetCategories",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "AssetCategories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "AssetCategories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "AssetCategories",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "AssetCategories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "UpdatedBy",
                table: "AssetCategories",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_CreatedAt",
                table: "Assets",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_CreatedBy",
                table: "Assets",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_IsArchived",
                table: "Assets",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_UpdatedBy",
                table: "Assets",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AssetCategories_CreatedBy",
                table: "AssetCategories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AssetCategories_IsArchived",
                table: "AssetCategories",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_AssetCategories_Name",
                table: "AssetCategories",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_AssetCategories_UpdatedBy",
                table: "AssetCategories",
                column: "UpdatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_AssetCategories_Users_CreatedBy",
                table: "AssetCategories",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_AssetCategories_Users_UpdatedBy",
                table: "AssetCategories",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_AssetCategories_CategoryId",
                table: "Assets",
                column: "CategoryId",
                principalTable: "AssetCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_CreatedBy",
                table: "Assets",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_UpdatedBy",
                table: "Assets",
                column: "UpdatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);
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
                name: "FK_Assets_AssetCategories_CategoryId",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_CreatedBy",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_UpdatedBy",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_CreatedAt",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_CreatedBy",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_IsArchived",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_UpdatedBy",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_CreatedBy",
                table: "AssetCategories");

            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_IsArchived",
                table: "AssetCategories");

            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_Name",
                table: "AssetCategories");

            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_UpdatedBy",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "Module",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "AssetStatus",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "HandlingTypeSnapshot",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "AssetCategories");

            migrationBuilder.RenameColumn(
                name: "IsArchived",
                table: "Assets",
                newName: "Archived");

            migrationBuilder.RenameColumn(
                name: "IsArchived",
                table: "AssetCategories",
                newName: "Archived");

            migrationBuilder.AlterColumn<string>(
                name: "CategoryId",
                table: "Assets",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Assets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "AssetCategories",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "AssetCategories",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_AssetCategories_CategoryId",
                table: "Assets",
                column: "CategoryId",
                principalTable: "AssetCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
