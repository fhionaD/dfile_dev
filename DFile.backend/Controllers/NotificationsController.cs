using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public NotificationsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/notifications?unreadOnly=false
        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var role = User.GetJwtRole() ?? "";
            var tenantId = GetCurrentTenantId();

            var query = _context.Notifications.AsQueryable();

            if (IsSuperAdmin())
            {
                query = query.Where(n => n.TenantId == null || n.TargetRole == "Super Admin");
            }
            else
            {
                query = query.Where(n =>
                    n.TenantId == tenantId &&
                    (n.UserId == userId || n.UserId == null) &&
                    (n.TargetRole == null || n.TargetRole == role)
                );
            }

            if (unreadOnly)
                query = query.Where(n => !n.IsRead);

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .Select(n => new
                {
                    n.Id,
                    n.Message,
                    n.Type,
                    n.Module,
                    n.EntityType,
                    n.EntityId,
                    n.IsRead,
                    n.CreatedAt,
                    n.ReadAt,
                })
                .ToListAsync();

            return Ok(notifications);
        }

        // GET: api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var role = User.GetJwtRole() ?? "";
            var tenantId = GetCurrentTenantId();

            var query = _context.Notifications.Where(n => !n.IsRead);

            if (IsSuperAdmin())
            {
                query = query.Where(n => n.TenantId == null || n.TargetRole == "Super Admin");
            }
            else
            {
                query = query.Where(n =>
                    n.TenantId == tenantId &&
                    (n.UserId == userId || n.UserId == null) &&
                    (n.TargetRole == null || n.TargetRole == role)
                );
            }

            var count = await query.CountAsync();
            return Ok(new { count });
        }

        // PUT: api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(long id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                return NotFound();

            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var role = User.GetJwtRole() ?? "";
            var tenantId = GetCurrentTenantId();

            var query = _context.Notifications.Where(n => !n.IsRead);

            if (IsSuperAdmin())
            {
                query = query.Where(n => n.TenantId == null || n.TargetRole == "Super Admin");
            }
            else
            {
                query = query.Where(n =>
                    n.TenantId == tenantId &&
                    (n.UserId == userId || n.UserId == null) &&
                    (n.TargetRole == null || n.TargetRole == role)
                );
            }

            await query.ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.UtcNow)
            );

            return NoContent();
        }

        // DELETE: api/notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(long id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                return NotFound();

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ── Static helper to create notifications from other controllers ──
        public static async Task CreateNotification(
            AppDbContext context,
            string message,
            string type,
            string? module = null,
            string? entityType = null,
            string? entityId = null,
            int? userId = null,
            string? targetRole = null,
            int? tenantId = null)
        {
            context.Notifications.Add(new Notification
            {
                Message = message,
                Type = type,
                Module = module,
                EntityType = entityType,
                EntityId = entityId,
                UserId = userId,
                TargetRole = targetRole,
                TenantId = tenantId,
            });
            await context.SaveChangesAsync();
        }
    }
}
