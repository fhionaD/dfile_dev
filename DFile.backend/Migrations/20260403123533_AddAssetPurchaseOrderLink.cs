using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetPurchaseOrderLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Assets', 'PurchaseOrderId') IS NULL
    ALTER TABLE [Assets] ADD [PurchaseOrderId] nvarchar(450) NULL;
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.Assets', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Assets_PurchaseOrderId' AND object_id = OBJECT_ID(N'dbo.Assets'))
    CREATE NONCLUSTERED INDEX [IX_Assets_PurchaseOrderId] ON [dbo].[Assets] ([PurchaseOrderId]);
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.Assets', N'U') IS NOT NULL
  AND COL_LENGTH('dbo.Assets', 'PurchaseOrderId') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Assets_PurchaseOrders_PurchaseOrderId')
    ALTER TABLE [dbo].[Assets] ADD CONSTRAINT [FK_Assets_PurchaseOrders_PurchaseOrderId]
        FOREIGN KEY ([PurchaseOrderId]) REFERENCES [dbo].[PurchaseOrders] ([Id]) ON DELETE SET NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_PurchaseOrders_PurchaseOrderId",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_PurchaseOrderId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "PurchaseOrderId",
                table: "Assets");
        }
    }
}
