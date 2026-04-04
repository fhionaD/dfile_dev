using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DFile.backend.Controllers
{
    [Authorize]
    [Route("api/users/settings")]
    [ApiController]
    public class UserSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserSettingsController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        [HttpGet("maintenance")]
        public async Task<ActionResult<MaintenanceSettingsDto>> GetMaintenanceSettings()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var settings = await _context.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
                return Ok(new MaintenanceSettingsDto());

            return Ok(new MaintenanceSettingsDto
            {
                EnableAnimations = settings.EnableAnimations,
                EnableAutoCost = settings.EnableAutoCost,
                EnableGlint = settings.EnableGlint,
                EnableGlassmorphism = settings.EnableGlassmorphism,
                EnableMinimalUI = settings.EnableMinimalUI,
                EnableDataCaching = settings.EnableDataCaching,
                EnableBatchOperations = settings.EnableBatchOperations,
            });
        }

        [HttpPost("maintenance")]
        public async Task<ActionResult<MaintenanceSettingsDto>> SaveMaintenanceSettings(
            [FromBody] MaintenanceSettingsDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var settings = await _context.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
            {
                settings = new UserSettings { UserId = userId.Value };
                _context.UserSettings.Add(settings);
            }

            settings.EnableAnimations = dto.EnableAnimations;
            settings.EnableAutoCost = dto.EnableAutoCost;
            settings.EnableGlint = dto.EnableGlint;
            settings.EnableGlassmorphism = dto.EnableGlassmorphism;
            settings.EnableMinimalUI = dto.EnableMinimalUI;
            settings.EnableDataCaching = dto.EnableDataCaching;
            settings.EnableBatchOperations = dto.EnableBatchOperations;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(dto);
        }
    }

    public class MaintenanceSettingsDto
    {
        public bool EnableAnimations { get; set; } = true;
        public bool EnableAutoCost { get; set; } = true;
        public bool EnableGlint { get; set; } = true;
        public bool EnableGlassmorphism { get; set; } = false;
        public bool EnableMinimalUI { get; set; } = false;
        public bool EnableDataCaching { get; set; } = false;
        public bool EnableBatchOperations { get; set; } = false;
    }
}
