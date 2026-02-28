using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using DFile.backend.Services;

namespace DFile.backend.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IAuditService _auditService;

        public AuthController(AppDbContext context, IConfiguration configuration, IAuditService auditService)
        {
            _context = context;
            _configuration = configuration;
            _auditService = auditService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            Console.WriteLine($"[Login Request] Email: {model.Email ?? "NULL"}, Password provided: {!string.IsNullOrEmpty(model.Password)}");

            if (string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Password))
            {
                Console.WriteLine("[Login] REJECTED - Missing email or password in payload");
                return BadRequest(new { message = "Email and password are required" });
            }

            var emailLower = model.Email.ToLower().Trim();
            Console.WriteLine($"[Login] Normalized Email: '{emailLower}'");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower().Trim() == emailLower);

            if (user == null)
            {
                Console.WriteLine($"[Login] FAILED - User '{emailLower}' not found in DB.");
                return Unauthorized(new { message = "Invalid email or password" });
            }

            Console.WriteLine($"[Login] User found: {user.Email}, Role: {user.Role}, Hash length: {user.PasswordHash?.Length ?? 0}");

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                Console.WriteLine($"[Login] FAILED - Password mismatch for user: {user.Email}");
                return Unauthorized(new { message = "Invalid email or password" });
            }

            var token = GenerateJwtToken(user);

            // Fetch tenant info if applicable
            object? tenantData = null;
            if (user.TenantId.HasValue)
            {
                var tenantEntity = await _context.Tenants.FindAsync(user.TenantId.Value);
                if (tenantEntity != null)
                {
                    tenantData = new
                    {
                        tenantEntity.Id,
                        tenantEntity.Name,
                        tenantEntity.SubscriptionPlan,
                        tenantEntity.MaxRooms,
                        tenantEntity.MaxPersonnel,
                        tenantEntity.AssetTracking,
                        tenantEntity.Depreciation,
                        tenantEntity.MaintenanceModule,
                        tenantEntity.ReportsLevel,
                        tenantEntity.Status
                    };
                }
            }

            Console.WriteLine($"[Login] SUCCESS: {user.Email}, Role: {user.Role}, Tenant: {user.TenantId}, MustChange: {user.MustChangePassword}");
            return Ok(new { token, user, tenant = tenantData, mustChangePassword = user.MustChangePassword });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdStr = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) 
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            // Load tenant data if the user belongs to one
            object? tenantData = null;
            if (user.TenantId.HasValue)
            {
                var tenantEntity = await _context.Tenants.FindAsync(user.TenantId.Value);
                if (tenantEntity != null)
                {
                    tenantData = new
                    {
                        tenantEntity.Id,
                        tenantEntity.Name,
                        tenantEntity.SubscriptionPlan,
                        tenantEntity.MaxRooms,
                        tenantEntity.MaxPersonnel,
                        tenantEntity.AssetTracking,
                        tenantEntity.Depreciation,
                        tenantEntity.MaintenanceModule,
                        tenantEntity.ReportsLevel,
                        tenantEntity.Status
                    };
                }
            }

            // Be careful not to return PasswordHash
            return Ok(new { 
                user.Id, 
                user.Name, 
                user.Email, 
                user.Role, 
                user.RoleLabel,
                user.TenantId,
                user.MustChangePassword,
                tenant = tenantData
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest(new { message = "Email is already in use" });
            }

            var user = new User
            {
                Name = model.Name,
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = model.Role ?? "Employee",
                RoleLabel = model.RoleLabel ?? (model.Role ?? "Employee"),
                TenantId = model.TenantId,
                MustChangePassword = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered successfully" });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordModel model)
        {
            var userIdStr = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                Console.WriteLine($"[ChangePassword] UNAUTHORIZED - Missing NameID claim. Value was: {userIdStr}");
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            Console.WriteLine($"[ChangePassword] Attempt for user: {user.Email}, Role: {user.Role}");

            if (!BCrypt.Net.BCrypt.Verify(model.OldPassword, user.PasswordHash))
            {
                Console.WriteLine($"[ChangePassword] REJECTED - Current password mismatch for {user.Email}");
                return BadRequest(new { message = "Current password is incorrect" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);
            user.MustChangePassword = false;
            
            await _context.SaveChangesAsync();
            Console.WriteLine($"[ChangePassword] SUCCESS for {user.Email}. MustChangePassword set to false.");

            // Audit (non-critical)
            try
            {
                await _auditService.LogActionAsync(
                    user.Id.ToString(),
                    user.Name,
                    "PasswordChanged",
                    "User changed their own password",
                    user.TenantId
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChangePassword] Audit logging failed: {ex.Message}");
            }

            return Ok(new { message = "Password updated successfully" });
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "superSecretKey12345678901234567890");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new List<Claim>
                {
                    new Claim("sub", user.Id.ToString()),
                    new Claim("email", user.Email),
                    new Claim("role", user.Role),
                    new Claim("TenantId", user.TenantId?.ToString() ?? "")
                }.Where(c => !string.IsNullOrEmpty(c.Value)).ToList()),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public class LoginModel
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
    }

    public class RegisterModel
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Role { get; set; }
        public string? RoleLabel { get; set; }
        public int? TenantId { get; set; }
    }

    public class ChangePasswordModel
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
