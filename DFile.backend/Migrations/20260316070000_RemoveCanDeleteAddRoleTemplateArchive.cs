using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCanDeleteAddRoleTemplateArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanDelete",
                table: "RolePermissions");

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "RoleTemplates",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "RoleTemplates");

            migrationBuilder.AddColumn<bool>(
                name: "CanDelete",
                table: "RolePermissions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
