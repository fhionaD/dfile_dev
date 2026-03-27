using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TasksController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [RequirePermission("Tasks", "CanView")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Tasks.Where(t => t.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(t => t.TenantId == tenantId);
            }

            return await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        }

        [HttpGet("{id}")]
        [RequirePermission("Tasks", "CanView")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            var tenantId = GetCurrentTenantId();
            var task = await _context.Tasks.FindAsync(id);

            if (task == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && task.TenantId != tenantId) return NotFound();

            return task;
        }

        [HttpPost]
        [RequirePermission("Tasks", "CanCreate")]
        public async Task<ActionResult<TaskItem>> PostTask(CreateTaskDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var task = new TaskItem
            {
                Id = Guid.NewGuid().ToString(),
                Title = dto.Title,
                Description = dto.Description,
                Priority = dto.Priority,
                Status = dto.Status,
                AssignedTo = dto.AssignedTo,
                DueDate = dto.DueDate,
                CreatedAt = DateTime.UtcNow,
                TenantId = IsSuperAdmin() ? null : tenantId,
                IsArchived = false
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTask", new { id = task.Id }, task);
        }

        [HttpPut("{id}")]
        [RequirePermission("Tasks", "CanEdit")]
        public async Task<IActionResult> PutTask(string id, UpdateTaskDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Tasks.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.Title = dto.Title;
            existing.Description = dto.Description;
            existing.Priority = dto.Priority;
            existing.Status = dto.Status;
            existing.AssignedTo = dto.AssignedTo;
            existing.DueDate = dto.DueDate;
            existing.IsArchived = dto.IsArchived;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("Tasks", "CanArchive")]
        public async Task<IActionResult> ArchiveTask(string id)
        {
            var tenantId = GetCurrentTenantId();
            var task = await _context.Tasks.FindAsync(id);

            if (task == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && task.TenantId != tenantId) return NotFound();

            task.IsArchived = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("Tasks", "CanArchive")]
        public async Task<IActionResult> RestoreTask(string id)
        {
            var tenantId = GetCurrentTenantId();
            var task = await _context.Tasks.FindAsync(id);

            if (task == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && task.TenantId != tenantId) return NotFound();

            task.IsArchived = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [RequirePermission("Tasks", "CanArchive")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            var tenantId = GetCurrentTenantId();
            var task = await _context.Tasks.FindAsync(id);

            if (task == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && task.TenantId != tenantId) return NotFound();

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
