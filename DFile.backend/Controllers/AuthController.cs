using DFile.backend.Authorization;
using DFile.backend.Constants;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace DFile.backend.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly PermissionService _permissionService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AppDbContext context, IConfiguration configuration, PermissionService permissionService, ILogger<AuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _permissionService = permissionService;
            _logger = logger;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto? dto)
        {
            try
            {
                // Input validation
                if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    return BadRequest(new { message = "Email and password are required." });
                }

                var emailNormalized = dto.Email.Trim().ToLowerInvariant();
                _logger.LogInformation("Login attempt for email: {Email}", emailNormalized);

                // Safe user lookup with case-insensitive email
                // Note: .ToLower() is used in LINQ (EF Core compatible), emailNormalized for comparison
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

                if (user == null)
                {
                    _logger.LogWarning("Login failed: User not found for email: {Email}", emailNormalized);
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                // Validate user account exists and basic data is present
                if (string.IsNullOrWhiteSpace(user.PasswordHash))
                {
                    _logger.LogError("Login failed: User {UserId} has no password hash", user.Id);
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                _logger.LogInformation("User found: {UserId}, Status: {Status}, TenantId: {TenantId}", user.Id, user.Status, user.TenantId);

                // Check tenant status if user belongs to a tenant
                if (user.TenantId.HasValue)
                {
                    var tenant = await _context.Tenants.FindAsync(user.TenantId.Value);
                    if (tenant != null && tenant.Status != "Active")
                    {
                        _logger.LogWarning("Login failed: Tenant inactive for user {UserId}, tenant status: {Status}", user.Id, tenant.Status);
                        return Unauthorized(new { message = "Your organization's account is inactive. Please contact support." });
                    }
                }

                // Verify password
                bool passwordMatches;
                try
                {
                    passwordMatches = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error verifying password for user {UserId}", user.Id);
                    passwordMatches = false;
                }

                if (!passwordMatches)
                {
                    _logger.LogWarning("Login failed: Invalid password for user {UserId}", user.Id);
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                // Generate token and user response
                _logger.LogInformation("Login successful for user {UserId}: {Email}", user.Id, user.Email);
                var token = GenerateJwtToken(user);
                var userResponse = await MapToResponseWithPermissions(user);
                return Ok(new { token, user = userResponse });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login");
                return StatusCode(500, new { message = "Internal server error. Please try again later." });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            return Ok(await MapToResponseWithPermissions(user));
        }

        [HttpPost("register")]
        [Authorize(Roles = "Super Admin,Admin")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "User with this email already exists." });

            // Resolve the role template
            var roleTemplate = await _context.RoleTemplates.FindAsync(dto.RoleTemplateId);
            if (roleTemplate == null)
                return BadRequest(new { message = "Invalid role template." });
            if (roleTemplate.IsArchived)
                return BadRequest(new { message = "Cannot assign an archived role template." });

            if (roleTemplate.IsSystem && !UserRoleConstants.IsKnownName(roleTemplate.Name))
                return BadRequest(new { message = "Invalid system role template name." });

            var callerRole = User.GetJwtRole();
            var callerTenantClaim = User.FindFirst("TenantId")?.Value;
            int? callerTenantId = string.IsNullOrEmpty(callerTenantClaim) ? null : int.Parse(callerTenantClaim);

            int? newUserTenantId;
            if (callerRole == "Super Admin")
            {
                newUserTenantId = dto.TenantId;
            }
            else
            {
                newUserTenantId = callerTenantId;
            }

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                Role = roleTemplate.Name,
                RoleLabel = roleTemplate.Name,
                TenantId = newUserTenantId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Create UserRoleAssignment if user has a tenant
            if (newUserTenantId.HasValue)
            {
                // Find or create TenantRole for this tenant + template
                var tenantRole = await _context.TenantRoles
                    .FirstOrDefaultAsync(tr => tr.TenantId == newUserTenantId.Value && tr.RoleTemplateId == dto.RoleTemplateId);

                if (tenantRole == null)
                {
                    tenantRole = new TenantRole
                    {
                        TenantId = newUserTenantId.Value,
                        RoleTemplateId = dto.RoleTemplateId
                    };
                    _context.TenantRoles.Add(tenantRole);
                    await _context.SaveChangesAsync();
                }

                _context.UserRoleAssignments.Add(new UserRoleAssignment
                {
                    UserId = user.Id,
                    TenantRoleId = tenantRole.Id
                });
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "User created", userId = user.Id });
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]!);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, UserRoleConstants.ToAuthorizationRole(user.Role))
            };

            if (user.TenantId.HasValue)
            {
                claims.Add(new Claim("TenantId", user.TenantId.Value.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private async Task<UserResponseDto> MapToResponseWithPermissions(User user)
        {
            var response = new UserResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role,
                RoleLabel = user.RoleLabel,
                Avatar = user.Avatar,
                Status = user.Status,
                TenantId = user.TenantId
            };

            // Resolve permissions for tenant users
            if (user.TenantId.HasValue && user.Role != "Super Admin")
            {
                response.Permissions = await _permissionService.GetUserPermissions(user.Id, user.TenantId.Value);
            }

            return response;
        }
    }
}
