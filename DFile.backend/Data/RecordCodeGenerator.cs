using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace DFile.backend.Data
{
    public static class RecordCodeGenerator
    {
        /// <summary>
        /// Generates a unique code with random 4 digits (e.g., PREFIX-1234).
        /// Retries up to 20 times, then falls back to 5 digits.
        /// </summary>
        public static async Task<string> GenerateUniqueCodeAsync(
            AppDbContext context, string prefix, Func<AppDbContext, string, Task<bool>> existsCheck)
        {
            for (int attempt = 0; attempt < 20; attempt++)
            {
                var digits = RandomNumberGenerator.GetInt32(1000, 10000);
                var code = $"{prefix}-{digits}";

                if (!await existsCheck(context, code))
                    return code;
            }

            var fallback = RandomNumberGenerator.GetInt32(10000, 100000);
            return $"{prefix}-{fallback}";
        }

        /// <summary>
        /// Generates a sequential Asset Code in format AST-0001, AST-0002, etc.
        /// Tenant-scoped and globally unique.
        /// </summary>
        public static async Task<string> GenerateAssetCodeAsync(AppDbContext context, int? tenantId)
        {
            var prefix = "AST-";

            var maxCode = await context.Assets
                .Where(a => a.AssetCode != null && a.AssetCode.StartsWith(prefix) && a.TenantId == tenantId)
                .Select(a => a.AssetCode!)
                .OrderByDescending(c => c)
                .FirstOrDefaultAsync();

            int nextSeq = 1;
            if (maxCode != null)
            {
                var parts = maxCode.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1], out var lastSeq))
                    nextSeq = lastSeq + 1;
            }

            return $"{prefix}{nextSeq:D4}";
        }

        /// <summary>
        /// Generates a unique Tag Number in format TAG-#### with random 4 digits.
        /// Ensures uniqueness across all tenants.
        /// </summary>
        public static async Task<string> GenerateTagNumberAsync(AppDbContext context)
        {
            for (int attempt = 0; attempt < 20; attempt++)
            {
                var digits = RandomNumberGenerator.GetInt32(1000, 10000);
                var tag = $"TAG-{digits}";

                if (!await context.Assets.AnyAsync(a => a.TagNumber == tag))
                    return tag;
            }

            // Fallback to 5 digits if collision after 20 attempts
            var fallback = RandomNumberGenerator.GetInt32(10000, 100000);
            return $"TAG-{fallback}";
        }

        public static Task<string> GenerateCategoryCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "ACAT",
                async (ctx, code) => await ctx.AssetCategories.AnyAsync(c => c.AssetCategoryCode == code));

        public static Task<string> GenerateEmployeeCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "USR",
                async (ctx, code) => await ctx.Employees.AnyAsync(e => e.EmployeeCode == code));

        public static Task<string> GenerateOrderCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "PO",
                async (ctx, code) => await ctx.PurchaseOrders.AnyAsync(p => p.OrderCode == code));

        public static Task<string> GenerateRoomCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "RM",
                async (ctx, code) => await ctx.Rooms.AnyAsync(r => r.RoomCode == code));

        public static Task<string> GenerateRoomCategoryCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "RMC",
                async (ctx, code) => await ctx.RoomCategories.AnyAsync(r => r.RoomCategoryCode == code));

        public static Task<string> GenerateRoomCategoryIdAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "RC",
                async (ctx, code) => await ctx.RoomCategories.AnyAsync(r => r.Id == code));

        public static Task<string> GenerateRoomSubCategoryCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "RSC",
                async (ctx, code) => await ctx.RoomSubCategories.AnyAsync(r => r.SubCategoryCode == code));

        public static Task<string> GenerateDepartmentCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "DPT",
                async (ctx, code) => await ctx.Departments.AnyAsync(d => d.DepartmentCode == code));

        public static Task<string> GenerateRoleCodeAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "ROL",
                async (ctx, code) => await ctx.Roles.AnyAsync(r => r.RoleCode == code));

        public static Task<string> GenerateAllocationIdAsync(AppDbContext context) =>
            GenerateUniqueCodeAsync(context, "AL",
                async (ctx, code) => await ctx.AssetAllocations.AnyAsync(a => a.Id == code));
    }
}
