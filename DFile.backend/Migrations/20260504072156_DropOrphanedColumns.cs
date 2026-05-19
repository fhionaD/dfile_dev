using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class DropOrphanedColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_TenantId_TagNumber",
                table: "Assets");

            // Drop composite index that includes SubCategory before dropping the column
            migrationBuilder.Sql("DROP INDEX IF EXISTS [IX_RoomCategories_Name_SubCategory_Tenant] ON [RoomCategories]");

            // Drop default constraint on SubCategory before dropping the column
            migrationBuilder.Sql(@"
                DECLARE @constraintName NVARCHAR(200)
                SELECT @constraintName = dc.name
                FROM sys.default_constraints dc
                JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                JOIN sys.tables t ON c.object_id = t.object_id
                WHERE t.name = 'RoomCategories' AND c.name = 'SubCategory'
                IF @constraintName IS NOT NULL
                    EXEC('ALTER TABLE [RoomCategories] DROP CONSTRAINT [' + @constraintName + ']')
            ");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "Room",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "TagNumber",
                table: "Assets");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "RoomCategories",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Room",
                table: "Assets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TagNumber",
                table: "Assets",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_TenantId_TagNumber",
                table: "Assets",
                columns: new[] { "TenantId", "TagNumber" },
                unique: true,
                filter: "[TagNumber] IS NOT NULL");
        }
    }
}
