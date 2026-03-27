using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class SyncRoomCategoryLegacySubCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('RoomCategories', 'SubCategory') IS NULL
BEGIN
    ALTER TABLE [RoomCategories]
    ADD [SubCategory] nvarchar(max) NOT NULL CONSTRAINT [DF_RoomCategories_SubCategory] DEFAULT('');
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('RoomCategories', 'SubCategory') IS NOT NULL
BEGIN
    DECLARE @ConstraintName nvarchar(200);
    SELECT @ConstraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.default_object_id = dc.object_id
    INNER JOIN sys.tables t
        ON t.object_id = c.object_id
    WHERE t.name = 'RoomCategories' AND c.name = 'SubCategory';

    IF @ConstraintName IS NOT NULL
        EXEC('ALTER TABLE [RoomCategories] DROP CONSTRAINT [' + @ConstraintName + ']');

    ALTER TABLE [RoomCategories] DROP COLUMN [SubCategory];
END
");
        }
    }
}
