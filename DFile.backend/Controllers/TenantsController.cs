using System.ComponentModel.DataAnnotations;
using System.Globalization;
using DFile.backend.Configuration;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using BCrypt.Net;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Super Admin")]
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPayMongoPaymentService _payMongo;
        private readonly PaymentAppOptions _paymentAppOptions;
        private readonly ILogger<TenantsController> _logger;

        public TenantsController(
            AppDbContext context,
            IPayMongoPaymentService payMongo,
            IOptions<PaymentAppOptions> paymentAppOptions,
            ILogger<TenantsController> logger)
        {
            _context = context;
            _payMongo = payMongo;
            _paymentAppOptions = paymentAppOptions.Value;
            _logger = logger;
        }

        /// <summary>Self-service org signup only. Super Admin cannot create tenants via API; use POST /api/Tenants/register.</summary>
        [HttpPost("register")]
        [AllowAnonymous]
        public Task<IActionResult> RegisterTenant([FromBody] CreateTenantDto dto, CancellationToken cancellationToken) =>
            CreateTenantCoreAsync(dto, isRegistration: true, cancellationToken: cancellationToken);

        /// <summary>Anonymous preflight: whether admin email (and optionally organization name) can be used for registration.</summary>
        [HttpGet("register/availability")]
        [AllowAnonymous]
        public async Task<ActionResult<RegisterAvailabilityDto>> GetRegisterAvailability(
            [FromQuery] string? email,
            [FromQuery] string? tenantName = null)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            var normEmail = NormalizeEmail(email);
            if (string.IsNullOrEmpty(normEmail) || !new EmailAddressAttribute().IsValid(normEmail))
                return BadRequest(new { message = "Enter a valid email address." });

            if (await _context.Users.AnyAsync(u => u.Email == normEmail))
                return Ok(new RegisterAvailabilityDto(false, "This email is already registered. Sign in instead."));

            if (!string.IsNullOrWhiteSpace(tenantName))
            {
                var trimmedName = tenantName.Trim();
                if (trimmedName.Length > 0 && await _context.Tenants.AnyAsync(t => t.Name == trimmedName))
                    return Ok(new RegisterAvailabilityDto(false, "An organization with this name already exists."));
            }

            return Ok(new RegisterAvailabilityDto(true));
        }

        private static string NormalizeEmail(string email) =>
            string.IsNullOrWhiteSpace(email) ? string.Empty : email.Trim().ToLowerInvariant();

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
        {
            for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
            {
                if (inner is SqlException sql && (sql.Number == 2601 || sql.Number == 2627))
                    return true;
            }
            return false;
        }

        private async Task<IActionResult> CreateTenantCoreAsync(CreateTenantDto dto, bool isRegistration = false, CancellationToken cancellationToken = default)
        {
            var adminEmail = NormalizeEmail(dto.AdminEmail);
            var tenantName = string.IsNullOrWhiteSpace(dto.TenantName) ? string.Empty : dto.TenantName.Trim();

            if (string.IsNullOrEmpty(adminEmail))
                return BadRequest(new { message = "A valid work email is required." });

            if (await _context.Users.AnyAsync(u => u.Email == adminEmail, cancellationToken))
                return BadRequest(new { message = "This email is already registered. Sign in instead." });

            if (string.IsNullOrEmpty(tenantName))
                return BadRequest(new { message = "Organization name is required." });

            if (await _context.Tenants.AnyAsync(t => t.Name == tenantName, cancellationToken))
                return BadRequest(new { message = "An organization with this name already exists." });

            // Resolve plan from DB when PlanId is provided
            Plan? plan = null;
            if (dto.PlanId.HasValue)
            {
                plan = await _context.Plans
                    .FirstOrDefaultAsync(p => p.Id == dto.PlanId.Value && !p.IsArchived && p.IsActive, cancellationToken);
                if (plan == null)
                    return BadRequest(new { message = "The selected plan is not available. Refresh the page and try again." });
            }

            // Self-service registration always requires a valid plan — the legacy
            // (no-PlanId) path is for Super Admin only and bypasses payment entirely.
            if (isRegistration && plan == null)
                return BadRequest(new { message = "A subscription plan must be selected to create your organization." });

            try
            {
                // --- Build the Tenant ---
                Tenant tenant;
                if (plan != null)
                {
                    // Plan-based path: limits and features come from the DB plan record
                    tenant = new Tenant
                    {
                        Name = tenantName,
                        BusinessAddress = dto.BusinessAddress?.Trim() ?? string.Empty,
                        PlanId = plan.Id,
                        MaxRooms = plan.MaxRooms,
                        MaxPersonnel = plan.MaxPersonnel,
                        AssetTracking = plan.AssetTracking,
                        Depreciation = plan.Depreciation,
                        MaintenanceModule = plan.MaintenanceModule,
                        // Paid plans start as PendingPayment; free plans are Active immediately
                        Status = (isRegistration && plan.MonthlyCost > 0) ? "PendingPayment" : "Active"
                    };
                }
                else
                {
                    // Legacy enum-based path (used by Super Admin without PlanId)
                    tenant = Tenant.Create(tenantName, dto.SubscriptionPlan);
                    tenant.BusinessAddress = dto.BusinessAddress?.Trim() ?? string.Empty;
                }

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync(cancellationToken);

                var adminUser = new User
                {
                    FirstName = (dto.AdminFirstName ?? string.Empty).Trim(),
                    LastName = (dto.AdminLastName ?? string.Empty).Trim(),
                    Email = adminEmail,
                    Role = "Admin",
                    RoleLabel = "Admin",
                    TenantId = tenant.Id,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword)
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync(cancellationToken);

                // --- Free plan: activate subscription immediately ---
                if (isRegistration && plan != null && plan.MonthlyCost == 0)
                {
                    if (tenant.HasUsedFreePlan)
                        return UnprocessableEntity(new { message = "Free plan has already been used by this organization." });

                    var now = DateTime.UtcNow;
                    _context.TenantSubscriptions.Add(new TenantSubscription
                    {
                        TenantId = tenant.Id,
                        PlanId = plan.Id,
                        BillingCycle = BillingCycle.Monthly,
                        StartDate = now,
                        EndDate = now.AddDays(30),
                        Status = SubscriptionStatus.Active,
                        IsFreePlan = true
                    });
                    tenant.HasUsedFreePlan = true;
                    await _context.SaveChangesAsync(cancellationToken);

                    return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id },
                        new { tenantId = tenant.Id, requiresPayment = false });
                }

                // --- Paid plan: create PayMongo checkout session ---
                if (isRegistration && plan != null && plan.MonthlyCost > 0)
                {
                    var billingCycle = string.Equals(dto.BillingCycle, "Yearly", StringComparison.OrdinalIgnoreCase)
                        ? BillingCycle.Yearly
                        : BillingCycle.Monthly;

                    var amount = billingCycle == BillingCycle.Yearly
                        ? (int)(plan.YearlyCost * 100)
                        : (int)(plan.MonthlyCost * 100);

                    if (amount <= 0)
                    {
                        _context.Users.Remove(adminUser);
                        _context.Tenants.Remove(tenant);
                        await _context.SaveChangesAsync(cancellationToken);
                        return BadRequest(new { message = "Plan price is not configured. Contact support." });
                    }

                    var description = $"DFile {plan.Name} ({billingCycle}) – {tenantName}";
                    var payment = new PaymentTransaction
                    {
                        Id = Guid.NewGuid().ToString(),
                        TenantId = tenant.Id,
                        PlanId = plan.Id,
                        AmountCents = amount,
                        Currency = "PHP",
                        Description = description,
                        SubscriptionPlanCode = plan.Name,
                        BillingCycle = billingCycle.ToString(),
                        Provider = "PayMongo",
                        Status = "Pending",
                        ReferenceNumber = $"DFile-Reg-{tenant.Id}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8]}"
                    };

                    _context.PaymentTransactions.Add(payment);
                    await _context.SaveChangesAsync(cancellationToken);

                    var baseUrl = _paymentAppOptions.AppBaseUrl.TrimEnd('/');
                    var successUrl = $"{baseUrl}/register/payment-return?paymentId={Uri.EscapeDataString(payment.Id)}&status=success";
                    var cancelUrl = $"{baseUrl}/register/payment-return?paymentId={Uri.EscapeDataString(payment.Id)}&status=cancelled";

                    var metadata = new Dictionary<string, string>
                    {
                        ["tenant_id"] = tenant.Id.ToString(CultureInfo.InvariantCulture),
                        ["payment_transaction_id"] = payment.Id,
                        ["plan_id"] = plan.Id.ToString(CultureInfo.InvariantCulture),
                        ["billing_cycle"] = billingCycle.ToString(),
                        ["is_registration"] = "true"
                    };

                    var result = await _payMongo.CreateCheckoutSessionAsync(
                        amount, description, payment.ReferenceNumber,
                        successUrl, cancelUrl, metadata, cancellationToken);

                    if (!result.Ok || string.IsNullOrEmpty(result.CheckoutUrl))
                    {
                        // Roll back the newly created records so the user can retry
                        _context.PaymentTransactions.Remove(payment);
                        _context.Users.Remove(adminUser);
                        _context.Tenants.Remove(tenant);
                        await _context.SaveChangesAsync(cancellationToken);
                        _logger.LogError("Registration checkout creation failed for tenant '{Name}': {Error}",
                            tenantName, result.ErrorMessage);
                        return BadRequest(new { message = "Could not connect to the payment gateway. Please try again." });
                    }

                    payment.CheckoutSessionId = result.CheckoutSessionId;
                    payment.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync(cancellationToken);

                    return StatusCode(202, new
                    {
                        tenantId = tenant.Id,
                        requiresPayment = true,
                        checkoutUrl = result.CheckoutUrl,
                        paymentId = payment.Id
                    });
                }

                // Legacy path (Super Admin, no PlanId) — return the full tenant
                return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                return BadRequest(new
                {
                    message = "This email is already registered, or that organization name is already in use. Sign in or choose a different name."
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateTenant([FromBody] CreateTenantDto dto, CancellationToken cancellationToken)
        {
            return await CreateTenantCoreAsync(dto, isRegistration: false, cancellationToken: cancellationToken);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Tenant>> GetTenant(int id)
        {
            var tenant = await _context.Tenants.FindAsync(id);

            if (tenant == null)
            {
                return NotFound();
            }

            return tenant;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
        {
            var tenants = await _context.Tenants.ToListAsync();
            return Ok(tenants);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateTenantStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            if (dto.Status != "Active" && dto.Status != "Inactive" && dto.Status != "Archived" && dto.Status != "Suspended")
                return BadRequest("Invalid status. Must be Active, Inactive, Archived, or Suspended.");

            tenant.Status = dto.Status;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Status updated", status = tenant.Status });
        }

        [HttpGet("metrics")]
        public async Task<ActionResult> GetPlatformMetrics()
        {
            var totalTenants = await _context.Tenants.CountAsync();
            var activeTenants = await _context.Tenants.CountAsync(t => t.Status == "Active");
            var suspendedTenants = await _context.Tenants.CountAsync(t => t.Status == "Suspended");
            var totalUsers = await _context.Users.CountAsync();
            var totalAssets = await _context.Assets.CountAsync(a => !a.IsArchived);
            var totalRooms = await _context.Rooms.CountAsync();
            var totalMaintenanceRecords = await _context.MaintenanceRecords.CountAsync();
            var pendingOrders = await _context.PurchaseOrders.CountAsync(p => p.Status == "Pending" && !p.IsArchived);
            var openMaintenanceRecords = await _context.MaintenanceRecords.CountAsync(m => m.Status != "Completed" && !m.IsArchived);

            return Ok(new
            {
                totalTenants,
                activeTenants,
                suspendedTenants,
                totalUsers,
                totalAssets,
                totalRooms,
                totalMaintenanceRecords,
                pendingOrders,
                openMaintenanceRecords
            });
        }

        [HttpGet("risk-indicators")]
        public async Task<ActionResult> GetRiskIndicators()
        {
            var now = DateTime.UtcNow;

            var expiredWarranties = await _context.Assets
                .CountAsync(a => !a.IsArchived && a.WarrantyExpiry != null && a.WarrantyExpiry < now);

            var overdueMaintenanceCount = await _context.MaintenanceRecords
                .CountAsync(m => !m.IsArchived && m.Status != "Completed" && m.EndDate != null && m.EndDate < now);

            var highPriorityPending = await _context.MaintenanceRecords
                .CountAsync(m => !m.IsArchived && m.Priority == "High" && m.Status == "Pending");

            var fullyDepreciated = await _context.Assets
                .CountAsync(a => !a.IsArchived && a.CurrentBookValue <= 0);

            var suspendedTenants = await _context.Tenants
                .CountAsync(t => t.Status == "Suspended");

            return Ok(new
            {
                expiredWarranties,
                overdueMaintenanceCount,
                highPriorityPending,
                fullyDepreciated,
                suspendedTenants
            });
        }
    }
}
