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
    [Authorize(Roles = "Admin,Finance,Super Admin")]
    public class PurchaseOrdersController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public PurchaseOrdersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseOrder>>> GetPurchaseOrders([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.PurchaseOrders.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(p => p.TenantId == tenantId);
            }

            if (showArchived)
            {
                query = query.Where(p => p.Archived);
            }
            else
            {
                query = query.Where(p => !p.Archived);
            }

            return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseOrder>> GetPurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var order = await _context.PurchaseOrders.FindAsync(id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            return order;
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseOrder>> CreatePurchaseOrder(CreatePurchaseOrderDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var order = new PurchaseOrder
            {
                Id = $"PO-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                AssetName = dto.AssetName,
                Category = dto.Category,
                Vendor = dto.Vendor,
                Manufacturer = dto.Manufacturer,
                Model = dto.Model,
                SerialNumber = dto.SerialNumber,
                PurchasePrice = dto.PurchasePrice,
                PurchaseDate = dto.PurchaseDate,
                UsefulLifeYears = dto.UsefulLifeYears,
                Status = "Pending",
                RequestedBy = dto.RequestedBy,
                CreatedAt = DateTime.UtcNow,
                TenantId = IsSuperAdmin() ? null : tenantId,
                Archived = false
            };

            _context.PurchaseOrders.Add(order);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPurchaseOrder), new { id = order.Id }, order);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePurchaseOrder(string id, UpdatePurchaseOrderDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.PurchaseOrders.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.AssetName = dto.AssetName;
            existing.Category = dto.Category;
            existing.Vendor = dto.Vendor;
            existing.Manufacturer = dto.Manufacturer;
            existing.Model = dto.Model;
            existing.SerialNumber = dto.SerialNumber;
            existing.PurchasePrice = dto.PurchasePrice;
            existing.PurchaseDate = dto.PurchaseDate;
            existing.UsefulLifeYears = dto.UsefulLifeYears;
            existing.Status = dto.Status;
            existing.RequestedBy = dto.RequestedBy;
            existing.AssetId = dto.AssetId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchivePurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var order = await _context.PurchaseOrders.FindAsync(id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            order.Archived = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestorePurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var order = await _context.PurchaseOrders.FindAsync(id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            order.Archived = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
