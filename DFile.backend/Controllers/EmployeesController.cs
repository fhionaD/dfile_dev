using DFile.backend.Data;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public EmployeesController(AppDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        private int? GetTenantIdFromClaims()
        {
            var tenantIdStr = User.FindFirst("TenantId")?.Value;
            if (!string.IsNullOrEmpty(tenantIdStr) && int.TryParse(tenantIdStr, out int tenantId))
                return tenantId;
            return null;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
        {
            var tenantId = GetTenantIdFromClaims();
            IQueryable<Employee> query = _context.Employees;

            if (tenantId.HasValue)
            {
                query = query.Where(e => e.TenantId == tenantId.Value);
            }

            // Only return employees that have an actual associated user account
            var employees = await query.ToListAsync();
            var activeUserEmails = await _context.Users
                .Where(u => tenantId == null || u.TenantId == tenantId)
                .Select(u => u.Email.ToLower())
                .ToListAsync();
            
            Console.WriteLine($"[Debug] TenantId: {tenantId} | Active User Emails in DB: {string.Join(", ", activeUserEmails)}");
            
            var filtered = employees.Where(e => activeUserEmails.Contains(e.Email.ToLower())).ToList();
            
            Console.WriteLine($"[Employees] Tenant: {tenantId} | Fetched {employees.Count} total, returning {filtered.Count} active (Filtered orphans)");
            return filtered;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Employee>> GetEmployee(string id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();
            return employee;
        }

        [HttpPost]
        public async Task<ActionResult<Employee>> PostEmployee(Employee employee)
        {
            // Subscription limit enforcement
            var tenantId = GetTenantIdFromClaims();
            if (tenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(tenantId.Value);
                if (tenant != null)
                {
                    var currentCount = await _context.Employees.CountAsync(e => e.TenantId == tenantId.Value && e.Status != "Archived");
                    if (currentCount >= tenant.MaxPersonnel)
                    {
                        return BadRequest(new { message = $"Personnel limit reached ({tenant.MaxPersonnel}) for your {tenant.SubscriptionPlan} subscription plan. Please upgrade to add more personnel." });
                    }
                }
                employee.TenantId = tenantId.Value;
            }

            // check if user with same email exists (case-insensitive)
            var emailLower = employee.Email.ToLower();
            Console.WriteLine($"[PostEmployee] Creating employee: {employee.FirstName} {employee.LastName}, Email: {employee.Email}");
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailLower))
            {
                Console.WriteLine($"[PostEmployee] REJECTED - Email already exists: {employee.Email}");
                return BadRequest(new { message = "A user with this email address already exists." });
            }

            // Always generate a unique ID server-side
            employee.Id = $"EMP-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

            _context.Employees.Add(employee);

            // Create User Identity for login
            // Generate a secure temporary password
            string tempPassword = GenerateTemporaryPassword();
            
            // Map Organizational Role to User Role
            string userRole = "Employee";
            if (employee.Role.Contains("Finance", StringComparison.OrdinalIgnoreCase)) userRole = "Finance";
            else if (employee.Role.Contains("Maintenance", StringComparison.OrdinalIgnoreCase)) userRole = "Maintenance";
            else if (employee.Role.Contains("Procurement", StringComparison.OrdinalIgnoreCase)) userRole = "Procurement";
            else if (employee.Role.Contains("Admin", StringComparison.OrdinalIgnoreCase)) userRole = "Admin";

            var user = new User
            {
                Name = $"{employee.FirstName} {employee.LastName}",
                Email = employee.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
                Role = userRole,
                RoleLabel = employee.Role,
                TenantId = tenantId,
                Avatar = "https://github.com/shadcn.png", // Default avatar
                MustChangePassword = true
            };

            _context.Users.Add(user);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (EmployeeExists(employee.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            // Audit (non-critical)
            try
            {
                var actorUser = await GetCurrentUserAsync();
                await _auditService.LogActionAsync(
                    actorUser?.Id.ToString() ?? "System",
                    actorUser?.Name ?? "System",
                    "EmployeeCreated",
                    $"Created employee {employee.FirstName} {employee.LastName} ({employee.Email})",
                    employee.TenantId
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PostEmployee] Audit logging failed: {ex.Message}");
            }

            // Return employee plus the temporary password once so the admin can share it
            return CreatedAtAction("GetEmployee", new { id = employee.Id }, new
            {
                employee,
                temporaryPassword = tempPassword
            });
        }

        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == employee.Email);
            if (user == null) return NotFound("User account not found for this employee.");

            string tempPassword = GenerateTemporaryPassword();
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
            user.MustChangePassword = true;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw; // Or handle appropriately
            }

            // Audit (non-critical — don't let this crash the reset)
            try
            {
                var actorUser = await GetCurrentUserAsync();
                string actorId = actorUser?.Id.ToString() ?? "system";
                string actorName = actorUser?.Name ?? "System";
                int? actorTenantId = actorUser?.TenantId ?? employee.TenantId;

                await _auditService.LogActionAsync(
                    actorId,
                    actorName,
                    "PasswordReset",
                    $"Reset password for user {employee.Email} (UserId: {user.Id}).",
                    actorTenantId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ResetPassword] Audit logging failed: {ex.Message}");
            }

            return Ok(new { temporaryPassword = tempPassword });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutEmployee(string id, Employee employee)
        {
            if (id != employee.Id)
            {
                return BadRequest();
            }

            _context.Entry(employee).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EmployeeExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // PUT: api/Employees/archive/5
        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveEmployee(string id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound();
            }

            employee.Status = "Archived";
            _context.Entry(employee).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EmployeeExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // PUT: api/Employees/restore/5
        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreEmployee(string id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound();
            }

            employee.Status = "Active";
            _context.Entry(employee).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EmployeeExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(string id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            // Also delete the associated user record to avoid "ghost users"
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == employee.Email);
            if (user != null)
            {
                _context.Users.Remove(user);
            }

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            // Audit (non-critical)
            try
            {
                var actorUser = await GetCurrentUserAsync();
                await _auditService.LogActionAsync(
                    actorUser?.Id.ToString() ?? "system",
                    actorUser?.Name ?? "System",
                    "EmployeeDeleted",
                    $"Deleted employee {employee.FirstName} {employee.LastName} and their associated user account.",
                    employee.TenantId
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DeleteEmployee] Audit logging failed: {ex.Message}");
            }

            return NoContent();
        }

        private string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 10)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var userIdStr = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                return null;
            }

            return await _context.Users.FindAsync(userId);
        }

        private bool EmployeeExists(string id)
        {
            return _context.Employees.Any(e => e.Id == id);
        }
    }
}
