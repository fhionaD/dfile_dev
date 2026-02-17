using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            context.Database.EnsureCreated();

            // Look for any users.
            if (context.Users.Any())
            {
                return;   // DB has been seeded
            }

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
        }
    }
}
