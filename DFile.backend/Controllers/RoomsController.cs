using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomsController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public RoomsController(AppDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        [HttpGet]
        [RequirePermission("Rooms", "CanView")]
        public async Task<ActionResult<IEnumerable<RoomResponseDto>>> GetRooms(
            [FromQuery] string? search = null,
            [FromQuery] string? categoryId = null,
            [FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Rooms
                .Include(r => r.RoomCategory)
                .Include(r => r.RoomSubCategory)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .Where(r => r.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            if (!string.IsNullOrEmpty(categoryId))
            {
                query = query.Where(r => r.CategoryId == categoryId);
            }

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(r =>
                    (r.Name != null && r.Name.ToLower().Contains(search)) ||
                    (r.RoomCode != null && r.RoomCode.ToLower().Contains(search)) ||
                    (r.Floor != null && r.Floor.ToLower().Contains(search)));
            }

            var rooms = await query.ToListAsync();

            var roomIds = rooms.Select(r => r.Id).ToList();
            var allocationCounts = roomIds.Count == 0
                ? new Dictionary<string, int>()
                : await _context.AssetAllocations.AsNoTracking()
                    .Where(aa => roomIds.Contains(aa.RoomId) && aa.Status == "Active")
                    .GroupBy(aa => aa.RoomId)
                    .ToDictionaryAsync(g => g.Key, g => g.Count());

            var result = rooms.Select(r => new RoomResponseDto
            {
                Id = r.Id,
                RoomCode = r.RoomCode,
                Name = r.Name,
                Floor = r.Floor,
                CategoryId = r.CategoryId,
                CategoryName = r.RoomCategory?.Name,
                SubCategoryId = r.SubCategoryId,
                SubCategoryName = r.RoomSubCategory?.Name,
                IsArchived = r.IsArchived,
                TenantId = r.TenantId,
                CreatedByName = r.CreatedByUser != null ? r.CreatedByUser.FirstName + " " + r.CreatedByUser.LastName : null,
                UpdatedByName = r.UpdatedByUser != null ? r.UpdatedByUser.FirstName + " " + r.UpdatedByUser.LastName : null,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                RowVersion = r.RowVersion,
                ActiveAllocationCount = allocationCounts.GetValueOrDefault(r.Id)
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission("Rooms", "CanView")]
        public async Task<ActionResult<RoomResponseDto>> GetRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var room = await _context.Rooms
                .Include(r => r.RoomCategory)
                .Include(r => r.RoomSubCategory)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            var activeAllocationCount = await _context.AssetAllocations.AsNoTracking()
                .CountAsync(aa => aa.RoomId == room.Id && aa.Status == "Active");

            return Ok(new RoomResponseDto
            {
                Id = room.Id,
                RoomCode = room.RoomCode,
                Name = room.Name,
                Floor = room.Floor,
                CategoryId = room.CategoryId,
                CategoryName = room.RoomCategory?.Name,
                SubCategoryId = room.SubCategoryId,
                SubCategoryName = room.RoomSubCategory?.Name,
                IsArchived = room.IsArchived,
                TenantId = room.TenantId,
                CreatedByName = room.CreatedByUser != null ? room.CreatedByUser.FirstName + " " + room.CreatedByUser.LastName : null,
                UpdatedByName = room.UpdatedByUser != null ? room.UpdatedByUser.FirstName + " " + room.UpdatedByUser.LastName : null,
                CreatedAt = room.CreatedAt,
                UpdatedAt = room.UpdatedAt,
                RowVersion = room.RowVersion,
                ActiveAllocationCount = activeAllocationCount
            });
        }

        [HttpPost]
        [RequirePermission("Rooms", "CanCreate")]
        public async Task<ActionResult<RoomResponseDto>> PostRoom(CreateRoomDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var trimmedName = dto.Name?.Trim() ?? string.Empty;
            var trimmedFloor = dto.Floor?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { message = "Room name is required." });

            // Duplicate check: same Name + Floor + TenantId among active rooms
            var duplicateExists = await _context.Rooms.AnyAsync(r =>
                r.Name.ToLower() == trimmedName.ToLower() &&
                r.Floor.ToLower() == trimmedFloor.ToLower() &&
                !r.IsArchived &&
                (IsSuperAdmin() ? r.TenantId == null : r.TenantId == tenantId));
            if (duplicateExists)
                return Conflict(new { message = "A room with this name already exists on this floor." });

            RoomCategory? category = null;

            if (!string.IsNullOrEmpty(dto.CategoryId))
            {
                category = await _context.RoomCategories.FirstOrDefaultAsync(c => c.Id == dto.CategoryId && !c.IsArchived);
                if (category == null)
                    return BadRequest(new { message = "Room category not found or is archived." });
            }

            var room = new Room
            {
                Id = Guid.NewGuid().ToString(),
                RoomCode = await RecordCodeGenerator.GenerateRoomCodeAsync(_context),
                Name = trimmedName,
                Floor = trimmedFloor,
                CategoryId = string.IsNullOrEmpty(dto.CategoryId) ? null : dto.CategoryId,
                SubCategoryId = string.IsNullOrEmpty(dto.SubCategoryId) ? null : dto.SubCategoryId,
                IsArchived = false,
                TenantId = IsSuperAdmin() ? null : tenantId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.Rooms.Add(room);

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Create",
                EntityType = "Room",
                EntityId = room.Id,
                Module = "Locations",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { room.RoomCode, room.Name, room.Floor, room.CategoryId }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "A room with this name already exists on this floor." });
            }

            return CreatedAtAction("GetRoom", new { id = room.Id }, new RoomResponseDto
            {
                Id = room.Id,
                RoomCode = room.RoomCode,
                Name = room.Name,
                Floor = room.Floor,
                CategoryId = room.CategoryId,
                CategoryName = category?.Name,
                SubCategoryId = room.SubCategoryId,
                SubCategoryName = null,
                IsArchived = room.IsArchived,
                TenantId = room.TenantId,
                CreatedAt = room.CreatedAt,
                UpdatedAt = room.UpdatedAt,
                RowVersion = room.RowVersion,
                ActiveAllocationCount = 0
            });
        }

        [HttpPut("{id}")]
        [RequirePermission("Rooms", "CanEdit")]
        public async Task<IActionResult> PutRoom(string id, UpdateRoomDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Rooms.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            if (!string.IsNullOrEmpty(dto.CategoryId))
            {
                var categoryExists = await _context.RoomCategories.AnyAsync(c => c.Id == dto.CategoryId && !c.IsArchived);
                if (!categoryExists)
                    return BadRequest(new { message = "Room category not found or is archived." });
            }

            if (dto.RowVersion != null)
            {
                _context.Entry(existing).Property(p => p.RowVersion).OriginalValue = dto.RowVersion;
            }

            var oldValues = JsonSerializer.Serialize(new { existing.Name, existing.Floor, existing.CategoryId });

            existing.Name = dto.Name;
            existing.Floor = dto.Floor;
            existing.CategoryId = string.IsNullOrEmpty(dto.CategoryId) ? null : dto.CategoryId;
            existing.SubCategoryId = string.IsNullOrEmpty(dto.SubCategoryId) ? null : dto.SubCategoryId;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Update",
                EntityType = "Room",
                EntityId = id,
                Module = "Locations",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { dto.Name, dto.Floor, dto.CategoryId }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This record was modified by another user. Please refresh and try again." });
            }

            return NoContent();
        }

        [HttpPatch("{id}/archive")]
        [RequirePermission("Rooms", "CanArchive")]
        public async Task<IActionResult> ArchiveRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var room = await _context.Rooms.FindAsync(id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            var hasActiveAllocations = await _context.AssetAllocations.AsNoTracking()
                .AnyAsync(aa => aa.RoomId == id && aa.Status == "Active");
            if (hasActiveAllocations)
            {
                return Conflict(new
                {
                    message = "This room unit has one or more assets currently allocated to it. Deallocate or move those assets before archiving this room.",
                });
            }

            room.IsArchived = true;
            room.ArchivedAt = DateTime.UtcNow;
            room.ArchivedBy = userId?.ToString();
            room.UpdatedAt = DateTime.UtcNow;
            room.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Archive",
                EntityType = "Room",
                EntityId = id,
                Module = "Locations",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { room.Name, IsArchived = true }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}/restore")]
        [RequirePermission("Rooms", "CanArchive")]
        public async Task<IActionResult> RestoreRoom(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var room = await _context.Rooms.FindAsync(id);

            if (room == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId) return NotFound();

            room.IsArchived = false;
            room.ArchivedAt = null;
            room.ArchivedBy = null;
            room.UpdatedAt = DateTime.UtcNow;
            room.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Restore",
                EntityType = "Room",
                EntityId = id,
                Module = "Locations",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { room.Name, IsArchived = false }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("stats")]
        [RequirePermission("Rooms", "CanView")]
        public async Task<ActionResult<object>> GetRoomStats()
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Rooms.Where(r => !r.IsArchived).AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            var totalRooms = await query.CountAsync();

            // Count rooms that have active allocations
            var roomsWithAllocations = await _context.AssetAllocations
                .Where(a => a.Status == "Active")
                .Select(a => a.RoomId)
                .Distinct()
                .CountAsync();

            return new { Total = totalRooms, Occupied = roomsWithAllocations, Available = totalRooms - roomsWithAllocations };
        }
    }
}
