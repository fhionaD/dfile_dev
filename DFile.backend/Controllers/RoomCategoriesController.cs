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
    public class RoomCategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomCategoriesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/RoomCategories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoomCategory>>> GetRoomCategories()
        {
            return await _context.RoomCategories.ToListAsync();
        }

        // GET: api/RoomCategories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<RoomCategory>> GetRoomCategory(string id)
        {
            var roomCategory = await _context.RoomCategories.FindAsync(id);

            if (roomCategory == null)
            {
                return NotFound();
            }

            return roomCategory;
        }

        // POST: api/RoomCategories
        [HttpPost]
        public async Task<ActionResult<RoomCategory>> PostRoomCategory(RoomCategory roomCategory)
        {
            if (string.IsNullOrEmpty(roomCategory.Id))
            {
                roomCategory.Id = Guid.NewGuid().ToString();
            }
            
            _context.RoomCategories.Add(roomCategory);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (RoomCategoryExists(roomCategory.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetRoomCategory", new { id = roomCategory.Id }, roomCategory);
        }

        // PUT: api/RoomCategories/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRoomCategory(string id, RoomCategory roomCategory)
        {
            if (id != roomCategory.Id)
            {
                return BadRequest();
            }

            _context.Entry(roomCategory).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!RoomCategoryExists(id))
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

        // DELETE: api/RoomCategories/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoomCategory(string id)
        {
            var roomCategory = await _context.RoomCategories.FindAsync(id);
            if (roomCategory == null)
            {
                return NotFound();
            }

            _context.RoomCategories.Remove(roomCategory);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RoomCategoryExists(string id)
        {
            return _context.RoomCategories.Any(e => e.Id == id);
        }
    }
}
