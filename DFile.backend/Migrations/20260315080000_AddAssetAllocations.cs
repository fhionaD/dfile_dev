using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetAllocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssetAllocations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AssetId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoomId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PreviousRoomId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Active"),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AllocatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeallocatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AllocatedBy = table.Column<int>(type: "int", nullable: true),
                    DeallocatedBy = table.Column<int>(type: "int", nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetAllocations", x => x.Id);

                    table.ForeignKey(
                        name: "FK_AssetAllocations_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);

                    table.ForeignKey(
                        name: "FK_AssetAllocations_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);

                    table.ForeignKey(
                        name: "FK_AssetAllocations_Users_AllocatedBy",
                        column: x => x.AllocatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");

                    table.ForeignKey(
                        name: "FK_AssetAllocations_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssetAllocations_Asset_Status",
                table: "AssetAllocations",
                columns: new[] { "AssetId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AssetAllocations_RoomId",
                table: "AssetAllocations",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAllocations_AllocatedAt",
                table: "AssetAllocations",
                column: "AllocatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAllocations_AllocatedBy",
                table: "AssetAllocations",
                column: "AllocatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAllocations_TenantId",
                table: "AssetAllocations",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AssetAllocations");
        }
    }
}
