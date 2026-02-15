using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<Asset> Assets { get; set; }
        public DbSet<Employee> Employees { get; set; }
    }
}
