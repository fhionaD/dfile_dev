using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeesController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public EmployeesController(AppDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        [HttpGet]
        [RequirePermission("Employees", "CanView")]
        public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Employees.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(e => e.TenantId == tenantId);
            }

            if (showArchived)
            {
                query = query.Where(e => e.Status == "Archived");
            }
            else
            {
                query = query.Where(e => e.Status != "Archived");
            }

            var list = await query.ToListAsync();

            // Include login accounts (Users) not yet represented as Employees (e.g. created outside Personnel flow).
            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                var seenEmails = new HashSet<string>(list.Select(e => e.Email), StringComparer.OrdinalIgnoreCase);
                var users = await _context.Users
                    .Where(u => u.TenantId == tenantId)
                    .ToListAsync();

                foreach (var u in users)
                {
                    if (seenEmails.Contains(u.Email))
                        continue;

                    if (showArchived)
                    {
                        if (u.Status != "Archived") continue;
                    }
                    else
                    {
                        if (u.Status == "Archived") continue;
                    }

                    list.Add(new Employee
                    {
                        Id = $"EMP-USER-{u.Id}",
                        EmployeeCode = $"USR-{u.Id:D4}",
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        Email = u.Email,
                        ContactNumber = "—",
                        Department = "Organization",
                        Role = string.IsNullOrWhiteSpace(u.RoleLabel) ? u.Role : u.RoleLabel,
                        HireDate = u.CreatedAt,
                        Status = u.Status == "Archived" ? "Archived" : (u.Status == "Inactive" ? "Inactive" : "Active"),
                        TenantId = u.TenantId
                    });
                    seenEmails.Add(u.Email);
                }
            }

            return list
                .OrderBy(e => e.LastName)
                .ThenBy(e => e.FirstName)
                .ToList();
        }

        [HttpGet("{id}")]
        [RequirePermission("Employees", "CanView")]
        public async Task<ActionResult<Employee>> GetEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            return employee;
        }

        [HttpPost]
        [RequirePermission("Employees", "CanCreate")]
        public async Task<ActionResult<Employee>> PostEmployee(CreateEmployeeDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var defaultPassword = dto.LastName + "123";

            var employee = new Employee
            {
                Id = $"EMP-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                EmployeeCode = await RecordCodeGenerator.GenerateEmployeeCodeAsync(_context),
                FirstName = dto.FirstName,
                MiddleName = dto.MiddleName,
                LastName = dto.LastName,
                Email = dto.Email,
                ContactNumber = dto.ContactNumber,
                Department = dto.Department,
                Role = dto.Role,
                HireDate = dto.HireDate,
                Status = "Active",
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Employees.Add(employee);

            if (!await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                var user = new User
                {
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Email = dto.Email,
                    Role = "Employee",
                    RoleLabel = dto.Role,
                    TenantId = IsSuperAdmin() ? null : tenantId,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword)
                };
                _context.Users.Add(user);
            }

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Create",
                EntityType = "Employee",
                EntityId = employee.Id,
                Module = "Personnel",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { dto.FirstName, dto.LastName, dto.Email, dto.Department, dto.Role, dto.HireDate }),
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction("GetEmployee", new { id = employee.Id }, employee);
        }

        [HttpPut("{id}")]
        [RequirePermission("Employees", "CanEdit")]
        public async Task<IActionResult> PutEmployee(string id, UpdateEmployeeDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Employees.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            var oldValues = JsonSerializer.Serialize(new { existing.FirstName, existing.LastName, existing.Email, existing.Department, existing.Role, existing.HireDate, existing.Status });

            existing.FirstName = dto.FirstName;
            existing.MiddleName = dto.MiddleName;
            existing.LastName = dto.LastName;
            existing.Email = dto.Email;
            existing.ContactNumber = dto.ContactNumber;
            existing.Department = dto.Department;
            existing.Role = dto.Role;
            existing.HireDate = dto.HireDate;
            existing.Status = dto.Status;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Update",
                EntityType = "Employee",
                EntityId = id,
                Module = "Personnel",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { dto.FirstName, dto.LastName, dto.Email, dto.Department, dto.Role, dto.HireDate, dto.Status }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("Employees", "CanArchive")]
        public async Task<IActionResult> ArchiveEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            employee.Status = "Archived";

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Archive",
                EntityType = "Employee",
                EntityId = id,
                Module = "Personnel",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { employee.FirstName, employee.LastName, Status = "Archived" }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("Employees", "CanArchive")]
        public async Task<IActionResult> RestoreEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            employee.Status = "Active";

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Restore",
                EntityType = "Employee",
                EntityId = id,
                Module = "Personnel",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { employee.FirstName, employee.LastName, Status = "Active" }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
