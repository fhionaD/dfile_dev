using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Mapping;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PurchaseOrdersController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;
        private readonly INotificationService _notificationService;

        public PurchaseOrdersController(AppDbContext context, IAuditService auditService, INotificationService notificationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        private static string? NormalizeSerial(string? value)
        {
            var normalized = value?.Trim();
            return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
        }

        [HttpGet]
        [RequirePermission("PurchaseOrders", "CanView")]
        public async Task<ActionResult<IEnumerable<PurchaseOrderResponseDto>>> GetPurchaseOrders([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.PurchaseOrders.Include(p => p.Items).AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(p => p.TenantId == tenantId);
            }

            query = query.Where(p => p.IsArchived == showArchived);

            var orders = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

            // Gather approver names
            var approverIds = orders.Where(o => o.ApprovedBy.HasValue).Select(o => o.ApprovedBy!.Value).Distinct().ToList();
            var approverNames = approverIds.Any()
                ? await _context.Users.Where(u => approverIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName)
                : new Dictionary<int, string>();

            return Ok(orders.Select(o => MapToResponseDto(o, approverNames)));
        }

        [HttpGet("{id}")]
        [RequirePermission("PurchaseOrders", "CanView")]
        public async Task<ActionResult<PurchaseOrderResponseDto>> GetPurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var order = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            var approverNames = new Dictionary<int, string>();
            if (order.ApprovedBy.HasValue)
            {
                var user = await _context.Users.FindAsync(order.ApprovedBy.Value);
                if (user != null) approverNames[user.Id] = $"{user.FirstName} {user.LastName}";
            }

            return Ok(MapToResponseDto(order, approverNames));
        }

        [HttpPost]
        [RequirePermission("PurchaseOrders", "CanCreate")]
        public async Task<ActionResult<PurchaseOrderResponseDto>> CreatePurchaseOrder(CreatePurchaseOrderDto dto)
        {
            var tenantId = GetCurrentTenantId();

            if (dto.PurchaseDate.HasValue && dto.PurchaseDate.Value > DateTime.UtcNow)
                return BadRequest(new { message = "Purchase date cannot be in the future." });

            var order = new PurchaseOrder
            {
                Id = $"PO-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                OrderCode = await RecordCodeGenerator.GenerateOrderCodeAsync(_context),
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
                MaintenanceRecordId = string.IsNullOrWhiteSpace(dto.MaintenanceRecordId) ? null : dto.MaintenanceRecordId.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = IsSuperAdmin() ? null : tenantId,
                IsArchived = false
            };

            // Add line items if provided
            if (dto.Items != null)
            {
                foreach (var itemDto in dto.Items)
                {
                    order.Items.Add(new PurchaseOrderItem
                    {
                        Id = Guid.NewGuid().ToString(),
                        PurchaseOrderId = order.Id,
                        Description = itemDto.Description,
                        CategoryId = itemDto.CategoryId,
                        Quantity = itemDto.Quantity,
                        UnitCost = itemDto.UnitCost,
                        TotalCost = itemDto.TotalCost
                    });
                }
            }

            _context.PurchaseOrders.Add(order);

            var uidCreate = GetCurrentUserId();
            _auditService.AddEntry(HttpContext,
                IsSuperAdmin() ? null : tenantId,
                uidCreate,
                null,
                "Procurement",
                "Create",
                "PurchaseOrder",
                order.Id,
                $"Purchase order {order.OrderCode} created for {order.AssetName ?? "items"} (Pending).");

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPurchaseOrder), new { id = order.Id }, MapToResponseDto(order, new Dictionary<int, string>()));
        }

        [HttpPut("{id}")]
        [RequirePermission("PurchaseOrders", "CanEdit")]
        public async Task<IActionResult> UpdatePurchaseOrder(string id, UpdatePurchaseOrderDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            if (dto.PurchaseDate.HasValue && dto.PurchaseDate.Value > DateTime.UtcNow)
                return BadRequest(new { message = "Purchase date cannot be in the future." });

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
            existing.UpdatedAt = DateTime.UtcNow;

            // Update line items
            if (dto.Items != null)
            {
                // Remove existing items and replace
                _context.PurchaseOrderItems.RemoveRange(existing.Items);
                foreach (var itemDto in dto.Items)
                {
                    existing.Items.Add(new PurchaseOrderItem
                    {
                        Id = Guid.NewGuid().ToString(),
                        PurchaseOrderId = existing.Id,
                        Description = itemDto.Description,
                        CategoryId = itemDto.CategoryId,
                        Quantity = itemDto.Quantity,
                        UnitCost = itemDto.UnitCost,
                        TotalCost = itemDto.TotalCost
                    });
                }
            }

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Procurement",
                "Update",
                "PurchaseOrder",
                id,
                $"Purchase order {existing.OrderCode} updated (status {existing.Status}).");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/receive")]
        [RequirePermission("PurchaseOrders", "CanEdit")]
        public async Task<ActionResult<AssetResponseDto>> ReceivePurchaseOrder(string id, [FromBody] ReceivePurchaseOrderDto dto)
        {
            if (dto.DeliveryDate.Date > DateTime.UtcNow.Date)
                return BadRequest(new { message = "Delivery date cannot be in the future." });

            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var order = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();
            if (order.Status != "Approved")
                return BadRequest(new { message = $"Only approved orders can be received. Current status: {order.Status}" });
            if (!string.IsNullOrEmpty(order.AssetId))
                return BadRequest(new { message = "This purchase order has already been received." });

            var effectiveTenantId = order.TenantId;
            if (!IsSuperAdmin() && tenantId.HasValue)
                effectiveTenantId = tenantId;

            string? categoryId = dto.CategoryId;
            if (string.IsNullOrEmpty(categoryId))
                categoryId = order.Items.Select(i => i.CategoryId).FirstOrDefault(cid => !string.IsNullOrEmpty(cid));
            if (string.IsNullOrEmpty(categoryId) && !string.IsNullOrWhiteSpace(order.Category))
            {
                var match = await _context.AssetCategories
                    .Where(c => !c.IsArchived && c.CategoryName == order.Category
                        && (c.TenantId == effectiveTenantId || c.TenantId == null))
                    .OrderBy(c => c.TenantId == effectiveTenantId ? 0 : 1)
                    .FirstOrDefaultAsync();
                categoryId = match?.Id;
            }

            if (string.IsNullOrEmpty(categoryId))
                return BadRequest(new { message = "Could not resolve an asset category. Provide categoryId on the request or attach categories to PO line items." });

            var category = await _context.AssetCategories.FindAsync(categoryId);
            if (category == null || category.IsArchived)
                return BadRequest(new { message = "Invalid or archived asset category." });

            var normalizedSerial = NormalizeSerial(order.SerialNumber);
            if (!string.IsNullOrEmpty(normalizedSerial))
            {
                var serialExists = await _context.Assets.AnyAsync(a =>
                    a.SerialNumber != null &&
                    a.SerialNumber.ToUpper() == normalizedSerial.ToUpper() &&
                    ((effectiveTenantId == null && a.TenantId == null) || a.TenantId == effectiveTenantId));
                if (serialExists)
                    return Conflict(new { message = "Serial Number already exists for an asset in this tenant." });
            }

            var asset = new Asset
            {
                Id = Guid.NewGuid().ToString(),
                AssetCode = await RecordCodeGenerator.GenerateAssetCodeAsync(_context, effectiveTenantId),
                TagNumber = await RecordCodeGenerator.GenerateTagNumberAsync(_context),
                AssetName = order.AssetName,
                CategoryId = categoryId,
                LifecycleStatus = LifecycleStatus.Registered,
                CurrentCondition = AssetCondition.Good,
                HandlingTypeSnapshot = category.HandlingType.ToString(),
                Manufacturer = order.Manufacturer,
                Model = order.Model,
                SerialNumber = normalizedSerial,
                PurchaseDate = dto.DeliveryDate,
                Vendor = order.Vendor,
                AcquisitionCost = order.PurchasePrice,
                UsefulLifeYears = order.UsefulLifeYears,
                PurchasePrice = order.PurchasePrice,
                ResidualValue = null,
                SalvagePercentage = category.SalvagePercentage,
                SalvageValue = Math.Round(order.PurchasePrice * category.SalvagePercentage / 100m, 2),
                CurrentBookValue = order.PurchasePrice,
                MonthlyDepreciation = order.UsefulLifeYears > 0
                    ? Math.Round(order.PurchasePrice / (order.UsefulLifeYears * 12), 2)
                    : 0,
                DepreciationMonthsApplied = 0,
                TenantId = effectiveTenantId,
                PurchaseOrderId = order.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId,
                IsArchived = false
            };

            _context.Assets.Add(asset);
            order.AssetId = asset.Id;
            order.Status = "Delivered";
            order.UpdatedAt = DateTime.UtcNow;

            _context.Notifications.Add(new Notification
            {
                Message = $"Purchase order {order.OrderCode} was received. Asset {asset.AssetCode} was created.",
                Type = "Success",
                Module = "PurchaseOrders",
                EntityType = "Asset",
                EntityId = asset.Id,
                TargetRole = "Admin",
                TenantId = order.TenantId,
            });

            _auditService.AddEntry(HttpContext,
                effectiveTenantId,
                userId,
                null,
                "Procurement",
                "Receive",
                "PurchaseOrder",
                order.Id,
                $"Received PO {order.OrderCode}; created asset {asset.AssetCode}.");

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
            {
                return Conflict(new { message = "Serial Number already exists. Please use a unique Serial Number." });
            }

            var userNames = userId.HasValue
                ? await _context.Users.Where(u => u.Id == userId.Value).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName)
                : new Dictionary<int, string>();

            return Ok(AssetResponseMapper.ToDto(asset, category, userNames, null));
        }

        [HttpPatch("{id}/approve")]
        [RequirePermission("PurchaseOrders", "CanApprove")]
        public async Task<IActionResult> ApprovePurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var order = await _context.PurchaseOrders.FindAsync(id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            if (order.Status != "Pending")
                return BadRequest(new { message = $"Only pending orders can be approved. Current status: {order.Status}" });

            order.Status = "Approved";
            order.ApprovedBy = userId;
            order.ApprovedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext,
                tenantId,
                userId,
                null,
                "Procurement",
                "Approve",
                "PurchaseOrder",
                id,
                $"Finance approved purchase order {order.OrderCode}.");

            await _notificationService.NotifyPurchaseOrderApprovedAsync(order);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("PurchaseOrders", "CanArchive")]
        public async Task<IActionResult> ArchivePurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var order = await _context.PurchaseOrders.FindAsync(id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            order.IsArchived = true;
            order.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Procurement",
                "Archive",
                "PurchaseOrder",
                id,
                $"Purchase order {order.OrderCode} archived.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("PurchaseOrders", "CanArchive")]
        public async Task<IActionResult> RestorePurchaseOrder(string id)
        {
            var tenantId = GetCurrentTenantId();
            var order = await _context.PurchaseOrders.FindAsync(id);

            if (order == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && order.TenantId != tenantId) return NotFound();

            order.IsArchived = false;
            order.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Procurement",
                "Restore",
                "PurchaseOrder",
                id,
                $"Purchase order {order.OrderCode} restored from archive.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static PurchaseOrderResponseDto MapToResponseDto(PurchaseOrder o, Dictionary<int, string> approverNames) => new()
        {
            Id = o.Id,
            OrderCode = o.OrderCode,
            AssetName = o.AssetName,
            Category = o.Category,
            Vendor = o.Vendor,
            Manufacturer = o.Manufacturer,
            Model = o.Model,
            SerialNumber = o.SerialNumber,
            PurchasePrice = o.PurchasePrice,
            PurchaseDate = o.PurchaseDate,
            UsefulLifeYears = o.UsefulLifeYears,
            Status = o.Status,
            RequestedBy = o.RequestedBy,
            AssetId = o.AssetId,
            ApprovedBy = o.ApprovedBy,
            ApprovedByName = o.ApprovedBy.HasValue && approverNames.TryGetValue(o.ApprovedBy.Value, out var n) ? n : null,
            ApprovedAt = o.ApprovedAt,
            IsArchived = o.IsArchived,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
            TenantId = o.TenantId,
            MaintenanceRecordId = o.MaintenanceRecordId,
            Items = o.Items.Select(i => new PurchaseOrderItemDto
            {
                Id = i.Id,
                Description = i.Description,
                CategoryId = i.CategoryId,
                Quantity = i.Quantity,
                UnitCost = i.UnitCost,
                TotalCost = i.TotalCost
            }).ToList()
        };
    }
}
