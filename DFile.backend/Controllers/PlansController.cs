using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PlansController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public PlansController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /// <summary>
        /// Get all plans (Super Admin only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult<IEnumerable<PlanDto>>> GetPlans()
        {
            var plans = await _context.Plans
                .Where(p => !p.IsArchived)
                .OrderBy(p => p.Name)
                .ToListAsync();

            return Ok(plans.Select(MapToPlanDto));
        }

        /// <summary>
        /// Get all plans including archived (Super Admin only)
        /// </summary>
        [HttpGet("all")]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult<IEnumerable<PlanDto>>> GetAllPlans()
        {
            var plans = await _context.Plans
                .OrderBy(p => p.Name)
                .ToListAsync();

            return Ok(plans.Select(MapToPlanDto));
        }

        /// <summary>
        /// Get a single plan by ID (Super Admin only)
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult<PlanDto>> GetPlan(int id)
        {
            var plan = await _context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            return Ok(MapToPlanDto(plan));
        }

        /// <summary>
        /// Create a new plan (Super Admin only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult<PlanDto>> CreatePlan(CreatePlanDto dto)
        {
            var plan = new Plan
            {
                Name = dto.Name,
                Description = dto.Description,
                MonthlyCost = dto.MonthlyCost,
                YearlyCost = dto.YearlyCost,
                MaxRooms = dto.MaxRooms,
                MaxPersonnel = dto.MaxPersonnel,
                CanCreateFinanceManager = dto.CanCreateFinanceManager,
                CanCreateMaintenanceManager = dto.CanCreateMaintenanceManager,
                AssetTracking = dto.AssetTracking,
                Depreciation = dto.Depreciation,
                MaintenanceModule = dto.MaintenanceModule,
                ReportsModule = dto.ReportsModule,
                ProcurementModule = dto.ProcurementModule,
                IsActive = true,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Plans.Add(plan);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, MapToPlanDto(plan));
        }

        /// <summary>
        /// Update an existing plan (Super Admin only)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Super Admin")]
        public async Task<IActionResult> UpdatePlan(int id, UpdatePlanDto dto)
        {
            var plan = await _context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.Name = dto.Name;
            plan.Description = dto.Description;
            plan.MonthlyCost = dto.MonthlyCost;
            plan.YearlyCost = dto.YearlyCost;
            plan.MaxRooms = dto.MaxRooms;
            plan.MaxPersonnel = dto.MaxPersonnel;
            plan.CanCreateFinanceManager = dto.CanCreateFinanceManager;
            plan.CanCreateMaintenanceManager = dto.CanCreateMaintenanceManager;
            plan.AssetTracking = dto.AssetTracking;
            plan.Depreciation = dto.Depreciation;
            plan.MaintenanceModule = dto.MaintenanceModule;
            plan.ReportsModule = dto.ReportsModule;
            plan.ProcurementModule = dto.ProcurementModule;
            plan.IsActive = dto.IsActive;
            plan.UpdatedAt = DateTime.UtcNow;

            _context.Plans.Update(plan);
            await _context.SaveChangesAsync();

            return Ok(MapToPlanDto(plan));
        }

        /// <summary>
        /// Archive a plan (Super Admin only)
        /// </summary>
        [HttpPut("{id}/archive")]
        [Authorize(Roles = "Super Admin")]
        public async Task<IActionResult> ArchivePlan(int id)
        {
            var plan = await _context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.IsArchived = true;
            plan.UpdatedAt = DateTime.UtcNow;

            _context.Plans.Update(plan);
            await _context.SaveChangesAsync();

            return Ok(MapToPlanDto(plan));
        }

        /// <summary>
        /// Activate a plan (Super Admin only)
        /// </summary>
        [HttpPut("{id}/activate")]
        [Authorize(Roles = "Super Admin")]
        public async Task<IActionResult> ActivatePlan(int id)
        {
            var plan = await _context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.IsActive = true;
            plan.IsArchived = false;
            plan.UpdatedAt = DateTime.UtcNow;

            _context.Plans.Update(plan);
            await _context.SaveChangesAsync();

            return Ok(MapToPlanDto(plan));
        }

        /// <summary>
        /// Get active plans for public display — used by the registration wizard (no auth required)
        /// </summary>
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<PlanDto>>> GetPublicPlans()
        {
            var plans = await _context.Plans
                .Where(p => p.IsActive && !p.IsArchived)
                .OrderBy(p => p.MonthlyCost)
                .ToListAsync();

            return Ok(plans.Select(MapToPlanDto));
        }

        private static PlanDto MapToPlanDto(Plan plan)
        {
            return new PlanDto
            {
                Id = plan.Id,
                Name = plan.Name,
                Description = plan.Description,
                MonthlyCost = plan.MonthlyCost,
                YearlyCost = plan.YearlyCost,
                MaxRooms = plan.MaxRooms,
                MaxPersonnel = plan.MaxPersonnel,
                CanCreateFinanceManager = plan.CanCreateFinanceManager,
                CanCreateMaintenanceManager = plan.CanCreateMaintenanceManager,
                AssetTracking = plan.AssetTracking,
                Depreciation = plan.Depreciation,
                MaintenanceModule = plan.MaintenanceModule,
                ReportsModule = plan.ReportsModule,
                ProcurementModule = plan.ProcurementModule,
                IsActive = plan.IsActive,
                IsArchived = plan.IsArchived,
                CreatedAt = plan.CreatedAt,
                UpdatedAt = plan.UpdatedAt
            };
        }
    }
}
