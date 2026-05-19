using DFile.backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/login-audits")]
    [ApiController]
    [Authorize(Roles = "Super Admin,Admin")]
    public class LoginAuditsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LoginAuditsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (pageSize > 200) pageSize = 200;
            var skip = (page - 1) * pageSize;

            var total = await _context.UserLoginAudits.CountAsync();
            var records = await _context.UserLoginAudits
                .OrderByDescending(a => a.AttemptedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.UserId,
                    a.Email,
                    a.AttemptStatus,
                    a.IpAddress,
                    a.AttemptedAt,
                    a.FailureReason,
                    a.IsSuspicious,
                    a.TenantId,
                    UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : null
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, records });
        }

        [HttpGet("suspicious")]
        public async Task<IActionResult> GetSuspicious([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (pageSize > 200) pageSize = 200;
            var skip = (page - 1) * pageSize;

            var total = await _context.UserLoginAudits.Where(a => a.IsSuspicious).CountAsync();
            var records = await _context.UserLoginAudits
                .Where(a => a.IsSuspicious)
                .OrderByDescending(a => a.AttemptedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.UserId,
                    a.Email,
                    a.AttemptStatus,
                    a.IpAddress,
                    a.AttemptedAt,
                    a.FailureReason,
                    a.TenantId,
                    UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : null
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, records });
        }
    }
}
