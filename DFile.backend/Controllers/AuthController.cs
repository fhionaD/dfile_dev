using DFile.backend.Data;
using DFile.backend.Models;
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

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            Console.WriteLine($"[Auth] Login attempt for: {model.Email} at {DateTime.UtcNow}");
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            
            if (user == null)
            {
                Console.WriteLine($"[Auth] User not found: {model.Email}");
                return Unauthorized(new { message = "Invalid credentials" });
            }

            // Check Tenant Status if user belongs to a tenant
            if (user.TenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(user.TenantId.Value);
                if (tenant != null && tenant.Status != "Active")
                {
                     return Unauthorized(new { message = "Your organization's account is inactive. Please contact support." });
                }
            }

            if (!BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
            {
                Console.WriteLine($"[Auth] Invalid password for: {model.Email}");
                return Unauthorized(new { message = "Invalid credentials" });
            }

            Console.WriteLine($"[Auth] Login successful for: {model.Email}");
            var token = GenerateJwtToken(user);
            return Ok(new { token, user });
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

            // Be careful not to return PasswordHash
            return Ok(new { 
                user.Id, 
                user.Name, 
                user.Email, 
                user.Role, 
                user.RoleLabel 
            });
        }

        [HttpPost("register")] // Helper for us to create users
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                return BadRequest("User already exists");

            var user = new User
            {
                Name = model.Name,
                Email = model.Email,
                Role = model.Role,
                RoleLabel = model.Role, // Simplified
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created" });
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]!);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public class LoginModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterModel
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Employee";
    }
}
