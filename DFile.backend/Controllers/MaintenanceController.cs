using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Authorize]
    [Route("api/maintenance")]
    [ApiController]
    public class MaintenanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MaintenanceController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/maintenance
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MaintenanceRecord>>> GetMaintenanceRecords()
        {
            return await _context.MaintenanceRecords.Where(r => !r.Archived).OrderByDescending(r => r.CreatedAt).ToListAsync();
        }

        // GET: api/maintenance/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MaintenanceRecord>> GetMaintenanceRecord(string id)
        {
            var record = await _context.MaintenanceRecords.FindAsync(id);

            if (record == null)
            {
                return NotFound();
            }

            return record;
        }

        // POST: api/maintenance
        [HttpPost]
        public async Task<ActionResult<MaintenanceRecord>> PostMaintenanceRecord(MaintenanceRecord record)
        {
            if (string.IsNullOrEmpty(record.Id))
                record.Id = Guid.NewGuid().ToString();
            
            record.CreatedAt = DateTime.UtcNow;
            _context.MaintenanceRecords.Add(record);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetMaintenanceRecord", new { id = record.Id }, record);
        }

        // PUT: api/maintenance/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMaintenanceRecord(string id, MaintenanceRecord record)
        {
            if (id != record.Id)
            {
                return BadRequest();
            }

            _context.Entry(record).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MaintenanceRecordExists(id))
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

        // DELETE: api/maintenance/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaintenanceRecord(string id)
        {
            var record = await _context.MaintenanceRecords.FindAsync(id);
            if (record == null)
            {
                return NotFound();
            }

            _context.MaintenanceRecords.Remove(record);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool MaintenanceRecordExists(string id)
        {
            return _context.MaintenanceRecords.Any(e => e.Id == id);
        }
    }
}
