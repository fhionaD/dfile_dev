using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Super Admin")]
    public class RoomsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public RoomsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Room>>> GetRooms(
            [FromQuery] string? search = null, 
            [FromQuery] string? categoryId = null,
            [FromQuery] string? status = null,
            [FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Rooms.Include(r => r.RoomCategory).AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            // By default exclude archived rooms
            if (showArchived)
            {
                query = query.Where(r => r.Archived);
            }
            else
            {
                query = query.Where(r => !r.Archived);
            }

            if (!string.IsNullOrEmpty(categoryId))
            {
                query = query.Where(r => r.CategoryId == categoryId);
            }

            if (!string.IsNullOrEmpty(status))
            {
                if (status.Contains(','))
                {
                    var statuses = status.Split(',').Select(s => s.Trim()).ToList();
                    query = query.Where(r => statuses.Contains(r.Status));
                }
                else
                {
                    query = query.Where(r => r.Status == status);
                }
            }

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(r => 
                    r.Name.ToLower().Contains(search) || 
                    r.UnitId.ToLower().Contains(search) ||
                    (r.Floor != null && r.Floor.ToLower().Contains(search)));
            }

            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Room>> GetRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var room = await _context.Rooms.Include(r => r.RoomCategory).FirstOrDefaultAsync(r => r.Id == id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            return room;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<ActionResult<Room>> PostRoom(CreateRoomDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var room = new Room
            {
                Id = Guid.NewGuid().ToString(),
                UnitId = dto.UnitId,
                Name = dto.Name,
                Floor = dto.Floor,
                CategoryId = string.IsNullOrEmpty(dto.CategoryId) ? null : dto.CategoryId,
                Status = dto.Status,
                MaxOccupancy = dto.MaxOccupancy,
                TenantId = IsSuperAdmin() ? null : tenantId,
                Archived = false
            };

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetRoom", new { id = room.Id }, room);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> PutRoom(string id, UpdateRoomDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Rooms.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.UnitId = dto.UnitId;
            existing.Name = dto.Name;
            existing.Floor = dto.Floor;
            existing.CategoryId = string.IsNullOrEmpty(dto.CategoryId) ? null : dto.CategoryId;
            existing.Status = dto.Status;
            existing.MaxOccupancy = dto.MaxOccupancy;
            existing.Archived = dto.Archived;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> ArchiveRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var room = await _context.Rooms.FindAsync(id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            room.Archived = true;
            room.Status = "Deactivated";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> RestoreRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var room = await _context.Rooms.FindAsync(id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            room.Archived = false;
            room.Status = "Available";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> DeleteRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var room = await _context.Rooms.FindAsync(id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetRoomStats()
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Rooms.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            var totalRooms = await query.CountAsync();
            var occupied = await query.CountAsync(r => r.Status == "Occupied");
            var available = await query.CountAsync(r => r.Status == "Available");
            var maintenance = await query.CountAsync(r => r.Status == "Maintenance");

            return new { Total = totalRooms, Occupied = occupied, Available = available, Maintenance = maintenance };
        }
    }
}
