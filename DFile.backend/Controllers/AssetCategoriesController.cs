using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AssetCategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AssetCategoriesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/AssetCategories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAssetCategories([FromQuery] bool showArchived = false)
        {
            var categories = await _context.AssetCategories
                .Where(c => showArchived || c.Status != "Archived")
                .ToListAsync();

            // Calculate item counts
            var assetCounts = await _context.Assets
                .GroupBy(a => a.Cat)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Name, x => x.Count);

            var result = categories.Select(c => new 
            {
                c.Id,
                c.Name,
                c.Description,
                c.Type,
                c.Status,
                Items = assetCounts.ContainsKey(c.Name) ? assetCounts[c.Name] : 0
            });

            return Ok(result);
        }

        // GET: api/AssetCategories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AssetCategory>> GetAssetCategory(string id)
        {
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null)
            {
                return NotFound();
            }

            return category;
        }

        // POST: api/AssetCategories
        [HttpPost]
        public async Task<ActionResult<AssetCategory>> PostAssetCategory(AssetCategory category)
        {
            _context.AssetCategories.Add(category);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (CategoryExists(category.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetAssetCategory", new { id = category.Id }, category);
        }

        // PUT: api/AssetCategories/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAssetCategory(string id, AssetCategory category)
        {
            if (id != category.Id)
            {
                return BadRequest();
            }

            _context.Entry(category).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CategoryExists(id))
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

        // PUT: api/AssetCategories/archive/5
        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveAssetCategory(string id)
        {
            var category = await _context.AssetCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            category.Status = "Archived";
            _context.Entry(category).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CategoryExists(id))
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
        
        // PUT: api/AssetCategories/restore/5
        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreAssetCategory(string id)
        {
            var category = await _context.AssetCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            category.Status = "Active";
            _context.Entry(category).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CategoryExists(id))
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

        private bool CategoryExists(string id)
        {
            return _context.AssetCategories.Any(e => e.Id == id);
        }
    }
}
