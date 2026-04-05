using DFile.backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260405210000_MaintenanceScheduleSeriesId")]
    public partial class MaintenanceScheduleSeriesId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'ScheduleSeriesId')
    ALTER TABLE [MaintenanceRecords] ADD [ScheduleSeriesId] nvarchar(450) NULL;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MaintenanceRecords_Tenant_ScheduleSeriesId' AND object_id = OBJECT_ID(N'[MaintenanceRecords]'))
CREATE NONCLUSTERED INDEX [IX_MaintenanceRecords_Tenant_ScheduleSeriesId]
    ON [MaintenanceRecords]([TenantId], [ScheduleSeriesId])
    WHERE [ScheduleSeriesId] IS NOT NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP INDEX IF EXISTS [IX_MaintenanceRecords_Tenant_ScheduleSeriesId] ON [MaintenanceRecords];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'ScheduleSeriesId')
    ALTER TABLE [MaintenanceRecords] DROP COLUMN [ScheduleSeriesId];
");
        }
    }
}
