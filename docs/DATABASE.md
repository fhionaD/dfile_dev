# Database Setup & Configuration

This guide explains how to set up the database for storing Rooms and Room Categories, both locally and in the cloud.

## 1. Apply Database Schemas (Migrations)

Since we've added new tables (`Rooms` and `RoomCategories`), you need to update the database schema.

### For Local Development (Uses `appsettings.Development.json`)

1. Open a terminal in the solution root.
2. Create a new migration:
   ```powershell
   dotnet ef migrations add AddRoomsAndCategories --project DFile.backend
   ```
3. Update the local database:
   ```powershell
   dotnet ef database update --project DFile.backend
   ```

### For Cloud / Production (Uses `appsettings.json`)

To update the cloud database, typically the application runs migrations on startup (if configured) or you can target the production connection string explicitly.

1. Ensure your `appsettings.json` has the correct `DefaultConnection` string for the cloud DB.
2. Run the update command:
   ```powershell
   dotnet ef database update --project DFile.backend --connection "Server=YOUR_CLOUD_SERVER;Database=YOUR_DB;User Id=YOUR_USER;Password=YOUR_PASSWORD;"
   ```
   *(Or simply deploy the app if it performs auto-migration on start)*

## Connection Strings

- **Local:** Configured in `appsettings.Development.json` -> `(localdb)\mssqllocaldb`
- **Cloud:** Configured in `appsettings.json` -> `db41747.public.databaseasp.net`

The application automatically selects the correct database based on the environment (`ASPNETCORE_ENVIRONMENT`).
