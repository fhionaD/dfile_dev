using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DFile.backend.Data;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DebugController : ControllerBase
    {
        private readonly AppDbContext _context;
        public DebugController(AppDbContext context) { _context = context; }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsersDebug()
        {
            var users = await _context.Users.Select(u => new { u.Id, u.Email, u.Role }).ToListAsync();
            return Ok(new { count = users.Count, users });
        }
        [HttpGet("auth")]
        public IActionResult GetAuthDebug()
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            var identity = User.Identity;

            return Ok(new
            {
                IsAuthenticated = identity?.IsAuthenticated,
                Name = identity?.Name,
                AuthenticationType = identity?.AuthenticationType,
                Claims = claims
            });
        }
    }
}
