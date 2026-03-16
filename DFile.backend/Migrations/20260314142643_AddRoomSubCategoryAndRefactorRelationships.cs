using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomSubCategoryAndRefactorRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubCategoryId",
                table: "Rooms",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "RoomCategories",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateTable(
                name: "RoomSubCategories",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SubCategoryCode = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RoomCategoryId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomSubCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomSubCategories_RoomCategories_RoomCategoryId",
                        column: x => x.RoomCategoryId,
                        principalTable: "RoomCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RoomSubCategories_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RoomSubCategories_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RoomSubCategories_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_SubCategoryId",
                table: "Rooms",
                column: "SubCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_RoomCategories_Name_Tenant",
                table: "RoomCategories",
                columns: new[] { "Name", "TenantId" },
                unique: true,
                filter: "[IsArchived] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_RoomSubCategories_Category_Name_Tenant",
                table: "RoomSubCategories",
                columns: new[] { "RoomCategoryId", "Name", "TenantId" },
                unique: true,
                filter: "[IsArchived] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_RoomSubCategories_CreatedBy",
                table: "RoomSubCategories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_RoomSubCategories_IsArchived",
                table: "RoomSubCategories",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_RoomSubCategories_SubCategoryCode",
                table: "RoomSubCategories",
                column: "SubCategoryCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomSubCategories_TenantId",
                table: "RoomSubCategories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_RoomSubCategories_UpdatedBy",
                table: "RoomSubCategories",
                column: "UpdatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_RoomSubCategories_SubCategoryId",
                table: "Rooms",
                column: "SubCategoryId",
                principalTable: "RoomSubCategories",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_RoomSubCategories_SubCategoryId",
                table: "Rooms");

            migrationBuilder.DropTable(
                name: "RoomSubCategories");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_SubCategoryId",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_Name_Tenant",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "SubCategoryId",
                table: "Rooms");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "RoomCategories",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
