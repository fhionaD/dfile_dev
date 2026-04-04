using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[UserSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [UserSettings] (
        [Id] int NOT NULL IDENTITY(1,1),
        [UserId] int NOT NULL,
        [EnableAnimations] bit NOT NULL,
        [EnableAutoCost] bit NOT NULL,
        [EnableGlint] bit NOT NULL,
        [EnableGlassmorphism] bit NOT NULL,
        [EnableMinimalUI] bit NOT NULL,
        [EnableDataCaching] bit NOT NULL,
        [EnableBatchOperations] bit NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserSettings_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.UserSettings', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserSettings_UserId' AND object_id = OBJECT_ID(N'dbo.UserSettings'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_UserSettings_UserId] ON [dbo].[UserSettings] ([UserId]);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserSettings");
        }
    }
}
