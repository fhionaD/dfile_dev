using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
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
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly IEmailEncryptionService _emailEncryption;

        public EmployeesController(AppDbContext context, IAuditService auditService, IEmailService emailService, IConfiguration configuration, IEmailEncryptionService emailEncryption)
        {
            _context = context;
            _auditService = auditService;
            _emailService = emailService;
            _configuration = configuration;
            _emailEncryption = emailEncryption;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim, CultureInfo.InvariantCulture);
        }

        [HttpGet]
        [Authorize]
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
                        ContactNumber = "â€”",
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
        [Authorize]
        public async Task<ActionResult<Employee>> GetEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            return employee;
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Employee>> PostEmployee(CreateEmployeeDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            if (await _context.Employees.AnyAsync(e => e.Email.ToLower() == dto.Email.ToLowerInvariant() && e.TenantId == (IsSuperAdmin() ? (int?)null : tenantId)))
                return BadRequest(new { message = "An employee with this email already exists." });

            if (await _context.Users.AnyAsync(u => u.EmailHash == _emailEncryption.Hash(dto.Email.Trim().ToLowerInvariant())))
                return BadRequest(new { message = "A user account with this email already exists." });

            var employee = new Employee
            {
                Id = $"EMP-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                EmployeeCode = await RecordCodeGenerator.GenerateEmployeeCodeAsync(_context),
                FirstName = dto.FirstName,
                MiddleName = dto.MiddleName,
                LastName = dto.LastName,
                Email = dto.Email,
                ContactNumber = dto.ContactNumber,
                Role = dto.Role,
                HireDate = dto.HireDate,
                Status = "Active",
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Employees.Add(employee);

            // Generate a secure single-use activation token
            var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
            var tokenHash = ComputeTokenHash(rawToken);
            var tokenExpiry = DateTime.UtcNow.AddHours(24);

            var user = new User
            {
                FirstName = dto.FirstName,
                MiddleName = dto.MiddleName,
                LastName = dto.LastName,
                Email = _emailEncryption.Encrypt(dto.Email.Trim().ToLowerInvariant()),
                EmailHash = _emailEncryption.Hash(dto.Email.Trim().ToLowerInvariant()),
                Role = dto.Role,
                RoleLabel = dto.Role,
                ContactNumber = dto.ContactNumber,
                Address = dto.Address,
                HireDate = dto.HireDate,
                TenantId = IsSuperAdmin() ? null : tenantId,
                PasswordHash = string.Empty,
                Status = "PendingActivation",
                ActivationTokenHash = tokenHash,
                ActivationTokenExpiry = tokenExpiry,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Create",
                EntityType = "Employee",
                EntityId = employee.Id,
                Module = "Personnel",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { dto.FirstName, dto.LastName, dto.Email, dto.Role, dto.HireDate }),
            });

            await _context.SaveChangesAsync();

            // Send activation email
            var appBaseUrl = $"{Request.Scheme}://{Request.Host}";
            var encodedToken = Uri.EscapeDataString(rawToken);
            var encodedEmail = Uri.EscapeDataString(dto.Email);
            var activationLink = $"{appBaseUrl}/setup-password?token={encodedToken}&email={encodedEmail}";

            var fullName = $"{dto.FirstName} {dto.LastName}";
            var emailHtml = BuildActivationEmailHtml(fullName, activationLink);

            try
            {
                await _emailService.SendEmailAsync(dto.Email, "Activate Your DFile Account", emailHtml);
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the creation â€” admin can resend
                var logger = HttpContext.RequestServices.GetService<ILogger<EmployeesController>>();
                logger?.LogError(ex, "Failed to send activation email to {Email}", dto.Email);
            }

            return CreatedAtAction("GetEmployee", new { id = employee.Id }, employee);
        }

        private static string ComputeTokenHash(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        private static string BuildActivationEmailHtml(string fullName, string activationLink)
        {
            return $"""
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
                  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h2 style="color: #1a1a2e; margin-bottom: 8px;">Welcome to DFile</h2>
                    <p style="color: #555;">Hi <strong>{fullName}</strong>,</p>
                    <p style="color: #555;">Your account has been created. Please click the button below to set your password and activate your account.</p>
                    <p style="color: #e05d00; font-size: 13px;">This link will expire in <strong>24 hours</strong> and can only be used once.</p>
                    <div style="margin: 32px 0; text-align: center;">
                      <a href="{activationLink}" style="background: #1a1a2e; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px;">Activate Account &amp; Set Password</a>
                    </div>
                    <p style="color: #888; font-size: 12px;">If you did not expect this email, please ignore it.</p>
                  </div>
                </body>
                </html>
                """;
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutEmployee(string id, UpdateEmployeeDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Employees.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            var oldValues = JsonSerializer.Serialize(new { existing.FirstName, existing.LastName, existing.Email, existing.Role, existing.HireDate, existing.Status });

            existing.FirstName = dto.FirstName;
            existing.MiddleName = dto.MiddleName;
            existing.LastName = dto.LastName;
            existing.Email = dto.Email;
            existing.ContactNumber = dto.ContactNumber;
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
                NewValues = JsonSerializer.Serialize(new { dto.FirstName, dto.LastName, dto.Email, dto.Role, dto.HireDate, dto.Status }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [Authorize]
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
        [Authorize]
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
