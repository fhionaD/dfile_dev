IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Assets] (
    [Id] nvarchar(450) NOT NULL,
    [Desc] nvarchar(max) NOT NULL,
    [Cat] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [Room] nvarchar(max) NOT NULL,
    [Image] nvarchar(max) NULL,
    [Manufacturer] nvarchar(max) NULL,
    [Model] nvarchar(max) NULL,
    [SerialNumber] nvarchar(max) NULL,
    [PurchaseDate] datetime2 NULL,
    [Vendor] nvarchar(max) NULL,
    [Value] decimal(18,2) NOT NULL,
    [UsefulLifeYears] int NOT NULL,
    [PurchasePrice] decimal(18,2) NOT NULL,
    [CurrentBookValue] decimal(18,2) NOT NULL,
    [MonthlyDepreciation] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_Assets] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Employees] (
    [Id] nvarchar(450) NOT NULL,
    [FirstName] nvarchar(max) NOT NULL,
    [MiddleName] nvarchar(max) NULL,
    [LastName] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [ContactNumber] nvarchar(max) NOT NULL,
    [Department] nvarchar(max) NOT NULL,
    [Role] nvarchar(max) NOT NULL,
    [HireDate] datetime2 NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Employees] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Tasks] (
    [Id] nvarchar(450) NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Priority] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [AssignedTo] nvarchar(max) NULL,
    [DueDate] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Tasks] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Role] nvarchar(max) NOT NULL,
    [RoleLabel] nvarchar(max) NOT NULL,
    [Avatar] nvarchar(max) NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260215145919_InitialCreate', N'8.0.14');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Users] ADD [TenantId] int NULL;
GO

ALTER TABLE [Tasks] ADD [Archived] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Tasks] ADD [TenantId] int NULL;
GO

ALTER TABLE [Employees] ADD [TenantId] int NULL;
GO

ALTER TABLE [Assets] ADD [TenantId] int NULL;
GO

CREATE TABLE [MaintenanceRecords] (
    [Id] nvarchar(450) NOT NULL,
    [AssetId] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [Priority] nvarchar(max) NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Frequency] nvarchar(max) NULL,
    [StartDate] datetime2 NULL,
    [EndDate] datetime2 NULL,
    [Cost] decimal(18,2) NULL,
    [DateReported] datetime2 NOT NULL,
    [Attachments] nvarchar(max) NULL,
    [Archived] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [TenantId] int NULL,
    CONSTRAINT [PK_MaintenanceRecords] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Tenants] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(max) NOT NULL,
    [SubscriptionPlan] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [MaxRooms] int NOT NULL,
    [MaxPersonnel] int NOT NULL,
    [AssetTracking] bit NOT NULL,
    [Depreciation] bit NOT NULL,
    [MaintenanceModule] bit NOT NULL,
    [ReportsLevel] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Tenants] PRIMARY KEY ([Id])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260219162928_AddTenantAndSubscription', N'8.0.14');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Tenants] ADD [Status] nvarchar(max) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260219180636_AddTenantStatusStatus', N'8.0.14');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [RoomCategories] (
    [Id] nvarchar(450) NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    [SubCategory] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [BaseRate] decimal(18,2) NOT NULL,
    [MaxOccupancy] int NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [Archived] bit NOT NULL,
    [TenantId] int NULL,
    CONSTRAINT [PK_RoomCategories] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Rooms] (
    [Id] nvarchar(450) NOT NULL,
    [UnitId] nvarchar(max) NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    [Floor] nvarchar(max) NOT NULL,
    [CategoryId] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [MaxOccupancy] int NOT NULL,
    [Archived] bit NOT NULL,
    [TenantId] int NULL,
    CONSTRAINT [PK_Rooms] PRIMARY KEY ([Id])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260220130309_AddRoomsAndCategories', N'8.0.14');
GO

COMMIT;
GO

