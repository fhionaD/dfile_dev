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

        public AuthController(AppDbContext context, IConfiguration configuration, PermissionService permissionService)
        {
            _context = context;
            _configuration = configuration;
            _permissionService = permissionService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid credentials" });
            }

            if (user.TenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(user.TenantId.Value);
                if (tenant != null && tenant.Status != "Active")
                {
                     return Unauthorized(new { message = "Your organization's account is inactive. Please contact support." });
                }
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid credentials" });
            }

            var token = GenerateJwtToken(user);
            var userResponse = await MapToResponseWithPermissions(user);
            return Ok(new { token, user = userResponse });
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

            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;
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
                new Claim(ClaimTypes.Role, user.Role)
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
