using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAtToDepartments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: some databases already had CreatedAt / indexes / FKs from manual fixes
            // or a partial apply. Skipping any step that already exists avoids blocking later migrations.
            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Departments', 'CreatedAt') IS NULL
                BEGIN
                    ALTER TABLE [Departments] ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT DF_Departments_CreatedAt DEFAULT (GETUTCDATE());
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Departments', 'CreatedBy') IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Departments_CreatedBy' AND object_id = OBJECT_ID(N'dbo.Departments'))
                BEGIN
                    CREATE NONCLUSTERED INDEX [IX_Departments_CreatedBy] ON [Departments]([CreatedBy]);
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Departments', 'UpdatedBy') IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Departments_UpdatedBy' AND object_id = OBJECT_ID(N'dbo.Departments'))
                BEGIN
                    CREATE NONCLUSTERED INDEX [IX_Departments_UpdatedBy] ON [Departments]([UpdatedBy]);
                END
                """);

            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Departments_Users_CreatedBy')
                  AND COL_LENGTH('dbo.Departments', 'CreatedBy') IS NOT NULL
                BEGIN
                    ALTER TABLE [Departments] ADD CONSTRAINT [FK_Departments_Users_CreatedBy]
                        FOREIGN KEY ([CreatedBy]) REFERENCES [Users] ([Id]);
                END
                """);

            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Departments_Users_UpdatedBy')
                  AND COL_LENGTH('dbo.Departments', 'UpdatedBy') IS NOT NULL
                BEGIN
                    ALTER TABLE [Departments] ADD CONSTRAINT [FK_Departments_Users_UpdatedBy]
                        FOREIGN KEY ([UpdatedBy]) REFERENCES [Users] ([Id]);
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Departments_Users_UpdatedBy",
                table: "Departments");

            migrationBuilder.DropForeignKey(
                name: "FK_Departments_Users_CreatedBy",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Departments_UpdatedBy",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Departments_CreatedBy",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Departments");

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
