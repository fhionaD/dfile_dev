using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: PaymentTransactions may already exist if applied manually or from another branch.
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[PaymentTransactions]', N'U') IS NULL
BEGIN
    CREATE TABLE [PaymentTransactions] (
        [Id] nvarchar(64) NOT NULL,
        [TenantId] int NOT NULL,
        [AmountCents] int NOT NULL,
        [Currency] nvarchar(8) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Provider] nvarchar(32) NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [CheckoutSessionId] nvarchar(128) NULL,
        [PaymentIntentId] nvarchar(128) NULL,
        [ReferenceNumber] nvarchar(128) NOT NULL,
        [SubscriptionPlanCode] nvarchar(32) NULL,
        [LastError] nvarchar(2000) NULL,
        [LastEventType] nvarchar(128) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PaymentTransactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PaymentTransactions_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([Id])
    );
END
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.PaymentTransactions', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PaymentTransactions_CheckoutSessionId' AND object_id = OBJECT_ID(N'dbo.PaymentTransactions'))
    CREATE NONCLUSTERED INDEX [IX_PaymentTransactions_CheckoutSessionId] ON [dbo].[PaymentTransactions] ([CheckoutSessionId]);
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.PaymentTransactions', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PaymentTransactions_ReferenceNumber' AND object_id = OBJECT_ID(N'dbo.PaymentTransactions'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_PaymentTransactions_ReferenceNumber] ON [dbo].[PaymentTransactions] ([ReferenceNumber]);
");
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.PaymentTransactions', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PaymentTransactions_Tenant_Status' AND object_id = OBJECT_ID(N'dbo.PaymentTransactions'))
    CREATE NONCLUSTERED INDEX [IX_PaymentTransactions_Tenant_Status] ON [dbo].[PaymentTransactions] ([TenantId], [Status]);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentTransactions");
        }
    }
}
