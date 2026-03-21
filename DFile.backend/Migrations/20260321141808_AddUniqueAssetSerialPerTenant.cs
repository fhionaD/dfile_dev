using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueAssetSerialPerTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE [dbo].[Assets]
SET [SerialNumber] = LEFT([SerialNumber], 450)
WHERE [SerialNumber] IS NOT NULL AND LEN([SerialNumber]) > 450;

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID('dbo.Assets')
      AND c.name = 'SerialNumber'
      AND t.name = 'nvarchar'
      AND c.max_length = -1
)
BEGIN
    ALTER TABLE [dbo].[Assets] ALTER COLUMN [SerialNumber] nvarchar(450) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assets_TenantId_SerialNumber' AND object_id = OBJECT_ID('dbo.Assets'))
BEGIN
    CREATE UNIQUE INDEX [IX_Assets_TenantId_SerialNumber]
    ON [dbo].[Assets]([TenantId], [SerialNumber])
    WHERE [SerialNumber] IS NOT NULL;
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assets_TenantId_SerialNumber' AND object_id = OBJECT_ID('dbo.Assets'))
BEGIN
    DROP INDEX [IX_Assets_TenantId_SerialNumber] ON [dbo].[Assets];
END

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID('dbo.Assets')
      AND c.name = 'SerialNumber'
      AND t.name = 'nvarchar'
      AND c.max_length <> -1
)
BEGIN
    ALTER TABLE [dbo].[Assets] ALTER COLUMN [SerialNumber] nvarchar(max) NULL;
END
");
        }
    }
}
