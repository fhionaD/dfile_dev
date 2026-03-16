using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add columns as nullable
            migrationBuilder.AddColumn<string>(
                name: "AssetCode", table: "Assets", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "CategoryCode", table: "AssetCategories", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "EmployeeCode", table: "Employees", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "OrderCode", table: "PurchaseOrders", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "RoomCode", table: "Rooms", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "RoomCategoryCode", table: "RoomCategories", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "DepartmentCode", table: "Departments", type: "nvarchar(450)", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "RoleCode", table: "Roles", type: "nvarchar(450)", nullable: true);

            // Step 2: Backfill existing records with unique codes
            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM Assets WHERE AssetCode IS NULL)
                UPDATE a SET AssetCode = 'AST-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM Assets a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM AssetCategories WHERE CategoryCode IS NULL)
                UPDATE a SET CategoryCode = 'CAT-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM AssetCategories a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM Employees WHERE EmployeeCode IS NULL)
                UPDATE a SET EmployeeCode = 'USR-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM Employees a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM PurchaseOrders WHERE OrderCode IS NULL)
                UPDATE a SET OrderCode = 'PO-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM PurchaseOrders a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM Rooms WHERE RoomCode IS NULL)
                UPDATE a SET RoomCode = 'RMU-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM Rooms a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM RoomCategories WHERE RoomCategoryCode IS NULL)
                UPDATE a SET RoomCategoryCode = 'RMC-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM RoomCategories a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM Departments WHERE DepartmentCode IS NULL)
                UPDATE a SET DepartmentCode = 'DPT-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM Departments a JOIN cte ON a.Id = cte.Id;");

            migrationBuilder.Sql(@"
                ;WITH cte AS (SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn FROM Roles WHERE RoleCode IS NULL)
                UPDATE a SET RoleCode = 'ROL-' + RIGHT('0000' + CAST(cte.rn AS NVARCHAR(10)), 4)
                FROM Roles a JOIN cte ON a.Id = cte.Id;");

            // Step 3: Make columns non-nullable
            migrationBuilder.AlterColumn<string>(
                name: "AssetCode", table: "Assets", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "CategoryCode", table: "AssetCategories", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "EmployeeCode", table: "Employees", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "OrderCode", table: "PurchaseOrders", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "RoomCode", table: "Rooms", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "RoomCategoryCode", table: "RoomCategories", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "DepartmentCode", table: "Departments", type: "nvarchar(450)", nullable: false, defaultValue: "");
            migrationBuilder.AlterColumn<string>(
                name: "RoleCode", table: "Roles", type: "nvarchar(450)", nullable: false, defaultValue: "");

            // Step 4: Create unique indexes
            migrationBuilder.CreateIndex(name: "IX_Assets_AssetCode", table: "Assets", column: "AssetCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_AssetCategories_CategoryCode", table: "AssetCategories", column: "CategoryCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_Employees_EmployeeCode", table: "Employees", column: "EmployeeCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_PurchaseOrders_OrderCode", table: "PurchaseOrders", column: "OrderCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_Rooms_RoomCode", table: "Rooms", column: "RoomCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_RoomCategories_RoomCategoryCode", table: "RoomCategories", column: "RoomCategoryCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_Departments_DepartmentCode", table: "Departments", column: "DepartmentCode", unique: true);
            migrationBuilder.CreateIndex(name: "IX_Roles_RoleCode", table: "Roles", column: "RoleCode", unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Rooms_RoomCode",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_RoomCategories_RoomCategoryCode",
                table: "RoomCategories");

            migrationBuilder.DropIndex(
                name: "IX_Roles_RoleCode",
                table: "Roles");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_OrderCode",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Employees_EmployeeCode",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Departments_DepartmentCode",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Assets_AssetCode",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_AssetCategories_CategoryCode",
                table: "AssetCategories");

            migrationBuilder.DropColumn(
                name: "RoomCode",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "RoomCategoryCode",
                table: "RoomCategories");

            migrationBuilder.DropColumn(
                name: "RoleCode",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "OrderCode",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "EmployeeCode",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "DepartmentCode",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "AssetCode",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "CategoryCode",
                table: "AssetCategories");
        }
    }
}
