using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetTenantIdFromClaims()
        {
            var tenantIdStr = User.FindFirst("TenantId")?.Value;
            if (!string.IsNullOrEmpty(tenantIdStr) && int.TryParse(tenantIdStr, out int tenantId))
                return tenantId;
            return null;
        }

        private string? GetUserRole()
        {
            var role = User.FindFirst("role")?.Value;
            if (string.IsNullOrEmpty(role)) role = User.Claims.FirstOrDefault(c => c.Type.ToLower().Contains("role"))?.Value;
            return role;
        }

        private (bool ok, string? roleFound) AccessCheck(params string[] allowedRoles)
        {
            var role = GetUserRole();
            if (role == null) return (false, null);
            return (allowedRoles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)), role);
        }

        private IActionResult ForbiddenResponse(string action, string? roleFound)
        {
            return StatusCode(403, new 
            { 
                error = "Forbidden", 
                message = $"Role '{roleFound}' is not authorized for {action}.",
                roleFound = roleFound,
                userId = User.FindFirst("sub")?.Value
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetTasks([FromQuery] bool showArchived = false)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Employee");
            if (!check.ok) return ForbiddenResponse("View Tasks", check.roleFound);

            var tenantId = GetTenantIdFromClaims();
            IQueryable<TaskItem> query = _context.Tasks.Where(t => t.Archived == showArchived);
            if (tenantId.HasValue) query = query.Where(t => t.TenantId == tenantId.Value);
            var result = await query.ToListAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(int id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Employee");
            if (!check.ok) return ForbiddenResponse("View Task", check.roleFound);

            var taskItem = await _context.Tasks.FindAsync(id);
            if (taskItem == null) return NotFound();
            return Ok(taskItem);
        }

        [HttpPost]
        public async Task<IActionResult> PostTask(TaskItem taskItem)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Employee");
            if (!check.ok) return ForbiddenResponse("Create Task", check.roleFound);

            var tenantId = GetTenantIdFromClaims();
            if (tenantId.HasValue) taskItem.TenantId = tenantId.Value;
            _context.Tasks.Add(taskItem);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetTask", new { id = taskItem.Id }, taskItem);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTask(int id, TaskItem taskItem)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Edit Task", check.roleFound);
            _context.Entry(taskItem).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin");
            if (!check.ok) return ForbiddenResponse("Delete Task", check.roleFound);
            var taskItem = await _context.Tasks.FindAsync(id);
            if (taskItem == null) return NotFound();
            _context.Tasks.Remove(taskItem);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
