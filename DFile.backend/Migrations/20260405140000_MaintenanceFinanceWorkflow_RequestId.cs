using DFile.backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260405140000_MaintenanceFinanceWorkflow_RequestId")]
    public class MaintenanceFinanceWorkflow_RequestId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: databases that already have these columns (partial apply / manual sync) skip safely.
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[PurchaseOrders]') AND name = N'MaintenanceRecordId')
    ALTER TABLE [PurchaseOrders] ADD [MaintenanceRecordId] nvarchar(450) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'FinanceRequestType')
    ALTER TABLE [MaintenanceRecords] ADD [FinanceRequestType] nvarchar(max) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'FinanceWorkflowStatus')
    ALTER TABLE [MaintenanceRecords] ADD [FinanceWorkflowStatus] nvarchar(max) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'LinkedPurchaseOrderId')
    ALTER TABLE [MaintenanceRecords] ADD [LinkedPurchaseOrderId] nvarchar(450) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'ReplacementRegisteredAssetId')
    ALTER TABLE [MaintenanceRecords] ADD [ReplacementRegisteredAssetId] nvarchar(450) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'RequestId')
    ALTER TABLE [MaintenanceRecords] ADD [RequestId] nvarchar(32) NULL;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MaintenanceRecords_RequestId' AND object_id = OBJECT_ID(N'[MaintenanceRecords]'))
CREATE UNIQUE NONCLUSTERED INDEX [IX_MaintenanceRecords_RequestId]
    ON [MaintenanceRecords]([RequestId])
    WHERE [RequestId] IS NOT NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP INDEX IF EXISTS [IX_MaintenanceRecords_RequestId] ON [MaintenanceRecords];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[PurchaseOrders]') AND name = N'MaintenanceRecordId')
    ALTER TABLE [PurchaseOrders] DROP COLUMN [MaintenanceRecordId];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'FinanceRequestType')
    ALTER TABLE [MaintenanceRecords] DROP COLUMN [FinanceRequestType];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'FinanceWorkflowStatus')
    ALTER TABLE [MaintenanceRecords] DROP COLUMN [FinanceWorkflowStatus];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'LinkedPurchaseOrderId')
    ALTER TABLE [MaintenanceRecords] DROP COLUMN [LinkedPurchaseOrderId];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'ReplacementRegisteredAssetId')
    ALTER TABLE [MaintenanceRecords] DROP COLUMN [ReplacementRegisteredAssetId];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaintenanceRecords]') AND name = N'RequestId')
    ALTER TABLE [MaintenanceRecords] DROP COLUMN [RequestId];
");
        }
    }
}
