using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            try
            {
                context.Database.Migrate();
                Console.WriteLine("Database migration applied successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error applying migrations: {ex.Message}");
                // Fallback for dev environments where migrations might be messed up, but for prod we want Migrate
            }

            // Look for the super admin specifically
            if (context.Users.Any(u => u.Email == "superadmin@dfile.com"))
            {
                Console.WriteLine("Super Admin already exists. Skipping seed.");
                return;   // DB has been seeded
            }

            Console.WriteLine("Seeding users...");

            var users = new User[]
            {
                new User
                {
                    Name = "Super Admin",
                    Email = "superadmin@dfile.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("superadmin123"),
                    Role = "Super Admin",
                    RoleLabel = "System Administrator"
                },
                new User
                {
                    Name = "Admin User",
                    Email = "admin@dfile.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "Admin",
                    RoleLabel = "Administrator"
                },
                new User
                {
                    Name = "John Doe",
                    Email = "employee@dfile.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("employee123"),
                    Role = "Employee",
                    RoleLabel = "Standard Employee"
                }
            };

            context.Users.AddRange(users);
            context.SaveChanges();
            Console.WriteLine("Users seeded successfully.");
        }
    }
}
