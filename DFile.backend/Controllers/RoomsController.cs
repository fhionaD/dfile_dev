using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Rooms
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Room>>> GetRooms(
            [FromQuery] string? search = null, 
            [FromQuery] string? categoryId = null,
            [FromQuery] string? status = null)
        {
            var query = _context.Rooms
                .Include(r => r.RoomCategory)
                .AsQueryable();

            if (!string.IsNullOrEmpty(categoryId))
            {
                query = query.Where(r => r.CategoryId == categoryId);
            }

            if (!string.IsNullOrEmpty(status))
            {
                // Handle multiple statuses if comma-separated
                if (status.Contains(","))
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

        // GET: api/Rooms/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Room>> GetRoom(string id)
        {
            var room = await _context.Rooms
                .Include(r => r.RoomCategory)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (room == null)
            {
                return NotFound();
            }

            return room;
        }

        // POST: api/Rooms
        [HttpPost]
        public async Task<ActionResult<Room>> PostRoom(Room room)
        {
            if (string.IsNullOrEmpty(room.Id))
            {
                room.Id = Guid.NewGuid().ToString();
            }

            // Handle empty category ID
            if (string.IsNullOrEmpty(room.CategoryId))
            {
                room.CategoryId = null;
            }
            
            _context.Rooms.Add(room);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (RoomExists(room.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetRoom", new { id = room.Id }, room);
        }

        // PUT: api/Rooms/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRoom(string id, Room room)
        {
            if (id != room.Id)
            {
                return BadRequest();
            }

            _context.Entry(room).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!RoomExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/Rooms/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoom(string id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return NotFound();
            }

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RoomExists(string id)
        {
            return _context.Rooms.Any(e => e.Id == id);
        }

        // GET: api/Rooms/Stats
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetRoomStats()
        {
            var totalRooms = await _context.Rooms.CountAsync();
            var occupied = await _context.Rooms.CountAsync(r => r.Status == "Occupied");
            var available = await _context.Rooms.CountAsync(r => r.Status == "Available");
            var maintenance = await _context.Rooms.CountAsync(r => r.Status == "Maintenance");

            return new
            {
                Total = totalRooms,
                Occupied = occupied,
                Available = available,
                Maintenance = maintenance
            };
        }
    }
}
