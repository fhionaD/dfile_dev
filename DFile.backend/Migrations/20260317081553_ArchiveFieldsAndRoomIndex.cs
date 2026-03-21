using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class ArchiveFieldsAndRoomIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add ArchivedAt/ArchivedBy to Rooms (safe, skips if exists)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Rooms') AND name = N'ArchivedAt')
                    ALTER TABLE [Rooms] ADD [ArchivedAt] datetime2 NULL;
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Rooms') AND name = N'ArchivedBy')
                    ALTER TABLE [Rooms] ADD [ArchivedBy] nvarchar(max) NULL;
            ");

            // Add ArchivedAt/ArchivedBy to RoomCategories (safe, skips if exists)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'RoomCategories') AND name = N'ArchivedAt')
                    ALTER TABLE [RoomCategories] ADD [ArchivedAt] datetime2 NULL;
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'RoomCategories') AND name = N'ArchivedBy')
                    ALTER TABLE [RoomCategories] ADD [ArchivedBy] nvarchar(max) NULL;
            ");

            // Ensure Name column type is nvarchar(450) for Rooms (needed for index)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rooms' AND COLUMN_NAME = 'Name' AND DATA_TYPE = 'nvarchar' AND CHARACTER_MAXIMUM_LENGTH = -1)
                    ALTER TABLE [Rooms] ALTER COLUMN [Name] nvarchar(450) NOT NULL;
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rooms' AND COLUMN_NAME = 'Floor' AND DATA_TYPE = 'nvarchar' AND CHARACTER_MAXIMUM_LENGTH = -1)
                    ALTER TABLE [Rooms] ALTER COLUMN [Floor] nvarchar(450) NOT NULL;
            ");

            // Auto-archive duplicate rooms before creating the unique index.
            // For each (Name, Floor, TenantId) group with duplicates among active rooms,
            // keep the earliest created room (MIN Id) and archive the rest.
            migrationBuilder.Sql(@"
                ;WITH Dupes AS (
                    SELECT Id,
                           ROW_NUMBER() OVER (PARTITION BY [Name], [Floor], [TenantId] ORDER BY [CreatedAt] ASC) AS rn
                    FROM [Rooms]
                    WHERE [IsArchived] = 0
                )
                UPDATE [Rooms]
                SET [IsArchived] = 1,
                    [ArchivedAt] = GETUTCDATE(),
                    [ArchivedBy] = N'SYSTEM_MIGRATION'
                WHERE Id IN (SELECT Id FROM Dupes WHERE rn > 1);
            ");

            // Add unique index on (Name, Floor, TenantId) for Rooms
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Rooms_Name_Floor_Tenant' AND object_id = OBJECT_ID(N'Rooms'))
                    CREATE UNIQUE INDEX [IX_Rooms_Name_Floor_Tenant] ON [Rooms] ([Name], [Floor], [TenantId]) WHERE [IsArchived] = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Rooms_Name_Floor_Tenant' AND object_id = OBJECT_ID(N'Rooms'))
                    DROP INDEX [IX_Rooms_Name_Floor_Tenant] ON [Rooms];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Rooms') AND name = N'ArchivedAt')
                    ALTER TABLE [Rooms] DROP COLUMN [ArchivedAt];
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Rooms') AND name = N'ArchivedBy')
                    ALTER TABLE [Rooms] DROP COLUMN [ArchivedBy];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'RoomCategories') AND name = N'ArchivedAt')
                    ALTER TABLE [RoomCategories] DROP COLUMN [ArchivedAt];
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'RoomCategories') AND name = N'ArchivedBy')
                    ALTER TABLE [RoomCategories] DROP COLUMN [ArchivedBy];
            ");
        }
    }
}
