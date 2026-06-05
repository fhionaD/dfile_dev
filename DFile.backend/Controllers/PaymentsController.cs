using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DFile.backend.Configuration;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DFile.backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPayMongoPaymentService _payMongo;
        private readonly ITenantContext _tenant;
        private readonly INotificationService _notifications;
        private readonly PayMongoOptions _payMongoOpts;
        private readonly PaymentAppOptions _paymentApp;
        private readonly ILogger<PaymentsController> _logger;

        public PaymentsController(
            AppDbContext db,
            IPayMongoPaymentService payMongo,
            ITenantContext tenant,
            INotificationService notifications,
            IOptions<PayMongoOptions> payMongoOpts,
            IOptions<PaymentAppOptions> paymentApp,
            ILogger<PaymentsController> logger)
        {
            _db = db;
            _payMongo = payMongo;
            _tenant = tenant;
            _notifications = notifications;
            _payMongoOpts = payMongoOpts.Value;
            _paymentApp = paymentApp.Value;
            _logger = logger;
        }

        /// <summary>Active subscription plans from the database + current subscription status for the tenant.</summary>
        [HttpGet("billing/plans")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<BillingPlansResponseDto>> GetBillingPlans(CancellationToken cancellationToken)
        {
            if (!_tenant.TenantId.HasValue || _tenant.IsSuperAdmin)
                return Forbid();

            var tenantEntity = await _db.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == _tenant.TenantId.Value, cancellationToken);
            if (tenantEntity == null)
                return NotFound();

            var plans = await _db.Plans
                .AsNoTracking()
                .Where(p => !p.IsArchived && p.IsActive)
                .OrderBy(p => p.MonthlyCost)
                .Select(p => new BillingPlanOptionDto
                {
                    Plan = p.Id,
                    Code = p.Name,
                    DisplayName = p.Name,
                    PricePesos = (int)p.MonthlyCost,
                    AmountCents = (int)(p.MonthlyCost * 100),
                    YearlyPricePesos = (int)p.YearlyCost,
                    YearlyAmountCents = (int)(p.YearlyCost * 100),
                    Summary = p.Description ?? string.Empty,
                    IsFreePlan = p.MonthlyCost == 0
                })
                .ToListAsync(cancellationToken);

            var currentPlanCode = tenantEntity.PlanId.HasValue
                ? (await _db.Plans.AsNoTracking()
                    .Where(p => p.Id == tenantEntity.PlanId)
                    .Select(p => p.Name)
                    .FirstOrDefaultAsync(cancellationToken) ?? "Unknown")
                : "None";

            // Current active/expiring subscription
            var activeSub = await _db.TenantSubscriptions
                .AsNoTracking()
                .Include(s => s.Plan)
                .Where(s => s.TenantId == _tenant.TenantId.Value
                    && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Expiring))
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync(cancellationToken);

            SubscriptionStatusDto? currentSubscription = null;
            if (activeSub != null)
            {
                var daysLeft = (int)(activeSub.EndDate.Date - DateTime.UtcNow.Date).TotalDays;
                currentSubscription = new SubscriptionStatusDto
                {
                    Id = activeSub.Id,
                    PlanName = activeSub.Plan.Name,
                    BillingCycle = activeSub.BillingCycle.ToString(),
                    StartDate = activeSub.StartDate,
                    EndDate = activeSub.EndDate,
                    Status = activeSub.Status.ToString(),
                    DaysUntilExpiry = daysLeft
                };
            }

            var hasActivePaidSubscription = activeSub != null && !activeSub.IsFreePlan
                && (activeSub.Status == SubscriptionStatus.Active || activeSub.Status == SubscriptionStatus.Expiring);

            return Ok(new BillingPlansResponseDto
            {
                CurrentPlanCode = currentPlanCode,
                CurrentPlan = tenantEntity.PlanId ?? 0,
                HasUsedFreePlan = tenantEntity.HasUsedFreePlan,
                HasActivePaidSubscription = hasActivePaidSubscription,
                CurrentSubscription = currentSubscription,
                Plans = plans
            });
        }

        /// <summary>Activate the free plan for a tenant. Can only be used once per tenant. No payment required.</summary>
        [HttpPost("free-plan/activate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ActivateFreePlan(CancellationToken cancellationToken)
        {
            if (!_tenant.TenantId.HasValue || _tenant.IsSuperAdmin)
                return Forbid();

            var tenantId = _tenant.TenantId.Value;
            var tenantEntity = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            if (tenantEntity == null)
                return NotFound();

            if (tenantEntity.HasUsedFreePlan)
                return UnprocessableEntity(new { message = "Free plan has already been used by this organization. Please subscribe to a paid plan." });

            // Block free activation when an active paid subscription exists
            var hasPaidSub = await _db.TenantSubscriptions.AnyAsync(
                s => s.TenantId == tenantId
                    && !s.IsFreePlan
                    && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Expiring),
                cancellationToken);
            if (hasPaidSub)
                return UnprocessableEntity(new { message = "Your organization has an active paid subscription. You cannot switch to the free plan while it is active." });

            var freePlan = await _db.Plans
                .FirstOrDefaultAsync(p => p.MonthlyCost == 0 && !p.IsArchived && p.IsActive, cancellationToken);
            if (freePlan == null)
                return NotFound(new { message = "No active free plan is available." });

            var now = DateTime.UtcNow;
            var subscription = new TenantSubscription
            {
                TenantId = tenantId,
                PlanId = freePlan.Id,
                BillingCycle = BillingCycle.Monthly,
                StartDate = now,
                EndDate = now.AddDays(30),
                Status = SubscriptionStatus.Active,
                IsFreePlan = true
            };

            tenantEntity.PlanId = freePlan.Id;
            tenantEntity.HasUsedFreePlan = true;
            tenantEntity.MaxRooms = freePlan.MaxRooms;
            tenantEntity.MaxPersonnel = freePlan.MaxPersonnel;
            tenantEntity.AssetTracking = freePlan.AssetTracking;
            tenantEntity.Depreciation = freePlan.Depreciation;
            tenantEntity.MaintenanceModule = freePlan.MaintenanceModule;
            tenantEntity.UpdatedAt = now;

            _db.TenantSubscriptions.Add(subscription);
            await _notifications.NotifySubscriptionActivatedAsync(tenantId, freePlan.Name, "Monthly (Free)", subscription.EndDate, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new { message = $"Free plan activated. Valid until {subscription.EndDate:MMMM d, yyyy}." });
        }

        /// <summary>Tenant Admin only â€” creates hosted checkout session for a paid plan (PayMongo).</summary>
        [HttpPost("paymongo/checkout")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PayMongoCheckoutResponseDto>> CreatePayMongoCheckout(
            [FromBody] CreatePayMongoCheckoutDto? dto,
            CancellationToken cancellationToken)
        {
            if (!_tenant.TenantId.HasValue || _tenant.IsSuperAdmin)
                return Forbid();

            if (string.IsNullOrWhiteSpace(dto?.PlanCode))
                return BadRequest(new { message = "Plan code is required." });

            var billingCycle = string.Equals(dto.BillingCycle, "Yearly", StringComparison.OrdinalIgnoreCase)
                ? BillingCycle.Yearly
                : BillingCycle.Monthly;

            var tenantId = _tenant.TenantId.Value;
            var tenantEntity = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            if (tenantEntity == null)
                return BadRequest(new { message = "Organization not found." });

            var plan = await _db.Plans
                .FirstOrDefaultAsync(p => p.Name == dto.PlanCode && !p.IsArchived && p.IsActive, cancellationToken);
            if (plan == null)
                return BadRequest(new { message = $"Plan '{dto.PlanCode}' not found or is not available." });

            // Reject free plans â€” use POST /api/payments/free-plan/activate instead
            if (plan.MonthlyCost == 0)
                return UnprocessableEntity(new { message = "Free plans cannot be purchased. Use the free plan activation endpoint." });

            var amount = billingCycle == BillingCycle.Yearly
                ? (int)(plan.YearlyCost * 100)
                : (int)(plan.MonthlyCost * 100);

            if (amount <= 0)
                return BadRequest(new { message = "Plan price is not configured correctly." });

            var description = $"DFile {plan.Name} ({billingCycle}) subscription";

            var payment = new PaymentTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                PlanId = plan.Id,
                AmountCents = amount,
                Currency = "PHP",
                Description = description,
                SubscriptionPlanCode = plan.Name,
                BillingCycle = billingCycle.ToString(),
                Provider = "PayMongo",
                Status = "Pending",
                ReferenceNumber = $"DFile-{tenantId}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8]}"
            };

            _db.PaymentTransactions.Add(payment);
            await _db.SaveChangesAsync(cancellationToken);

            var baseUrl = _paymentApp.AppBaseUrl.TrimEnd('/');
            var successUrl = $"{baseUrl}/tenant/billing/return?paymentId={Uri.EscapeDataString(payment.Id)}&status=success";
            var cancelUrl = $"{baseUrl}/tenant/billing/return?paymentId={Uri.EscapeDataString(payment.Id)}&status=cancelled";

            var metadata = new Dictionary<string, string>
            {
                ["tenant_id"] = tenantId.ToString(CultureInfo.InvariantCulture),
                ["payment_transaction_id"] = payment.Id,
                ["plan_id"] = plan.Id.ToString(CultureInfo.InvariantCulture),
                ["subscription_plan"] = plan.Name,
                ["billing_cycle"] = billingCycle.ToString()
            };

            var result = await _payMongo.CreateCheckoutSessionAsync(
                amount,
                description,
                payment.ReferenceNumber,
                successUrl,
                cancelUrl,
                metadata,
                cancellationToken);

            if (!result.Ok || string.IsNullOrEmpty(result.CheckoutUrl))
            {
                payment.Status = "Failed";
                payment.LastError = result.ErrorMessage ?? "Checkout creation failed";
                payment.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);
                return BadRequest(new { message = payment.LastError });
            }

            payment.CheckoutSessionId = result.CheckoutSessionId;
            payment.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new PayMongoCheckoutResponseDto
            {
                PaymentId = payment.Id,
                CheckoutUrl = result.CheckoutUrl
            });
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PaymentTransactionResponseDto>> GetPayment(string id, CancellationToken cancellationToken)
        {
            if (!_tenant.TenantId.HasValue || _tenant.IsSuperAdmin)
                return Forbid();

            var tx = await _db.PaymentTransactions
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

            if (tx == null) return NotFound();
            if (tx.TenantId != _tenant.TenantId.Value) return NotFound();

            return Ok(Map(tx));
        }

        [HttpPost("paymongo/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> PayMongoWebhook(CancellationToken cancellationToken)
        {
            Request.EnableBuffering();
            string body;
            using (var reader = new StreamReader(Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true))
            {
                body = await reader.ReadToEndAsync(cancellationToken);
            }

            Request.Body.Position = 0;

            var sigHeader = Request.Headers["Paymongo-Signature"].FirstOrDefault()
                ?? Request.Headers["paymongo-signature"].FirstOrDefault();

            if (string.IsNullOrEmpty(_payMongoOpts.WebhookSecret))
            {
                // A missing webhook secret means any caller can trigger subscription upgrades without paying.
                // Refuse ALL webhook requests when the secret is not configured so the misconfiguration is
                // immediately visible in logs rather than silently allowing unauthenticated events.
                _logger.LogError(
                    "PayMongo webhook rejected: PayMongo__WebhookSecret is not configured. " +
                    "Set the PAYMONGO__WEBHOOKSECRET GitHub secret and redeploy.");
                return StatusCode(503, new { error = "Webhook endpoint is not configured. Contact support." });
            }

            if (!VerifyWebhookSignature(sigHeader, body, _payMongoOpts.WebhookSecret))
            {
                _logger.LogWarning("PayMongo webhook signature verification failed.");
                return Unauthorized();
            }

            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                string? eventType = null;
                if (root.TryGetProperty("data", out var dataEl))
                {
                    if (dataEl.TryGetProperty("attributes", out var attr) && attr.TryGetProperty("type", out var typeEl))
                        eventType = typeEl.GetString();
                    else if (dataEl.TryGetProperty("type", out var dt))
                        eventType = dt.GetString();
                }

                TryFindCheckoutSessionId(root, out var checkoutSessionId);

                if (!string.IsNullOrEmpty(checkoutSessionId))
                {
                    var tx = await _db.PaymentTransactions
                        .FirstOrDefaultAsync(t => t.CheckoutSessionId == checkoutSessionId, cancellationToken);

                    if (tx != null)
                    {
                        var wasPaid = string.Equals(tx.Status, "Paid", StringComparison.OrdinalIgnoreCase);
                        tx.LastEventType = eventType;
                        tx.UpdatedAt = DateTime.UtcNow;

                        var et = eventType ?? string.Empty;
                        bool isPaidEvent = et.Contains("checkout_session.payment.paid", StringComparison.OrdinalIgnoreCase)
                            || (et.Contains("paid", StringComparison.OrdinalIgnoreCase) && et.Contains("checkout", StringComparison.OrdinalIgnoreCase))
                            || et.Equals("payment.paid", StringComparison.OrdinalIgnoreCase);
                        bool isFailedEvent = et.Contains("payment.failed", StringComparison.OrdinalIgnoreCase)
                            || et.Equals("payment.failed", StringComparison.OrdinalIgnoreCase);
                        bool isExpiredEvent = et.Contains("expired", StringComparison.OrdinalIgnoreCase);

                        if (isPaidEvent)
                            tx.Status = "Paid";
                        else if (isFailedEvent)
                            tx.Status = "Failed";
                        else if (isExpiredEvent)
                            tx.Status = "Expired";

                        // Activate subscription when payment is newly confirmed
                        if (isPaidEvent && !wasPaid && tx.PlanId > 0)
                        {
                            await ActivateSubscriptionAsync(tx, cancellationToken);
                        }

                        // Notify admin on payment failure
                        if (isFailedEvent && !wasPaid)
                        {
                            var plan = await _db.Plans.AsNoTracking()
                                .Where(p => p.Id == tx.PlanId)
                                .Select(p => p.Name)
                                .FirstOrDefaultAsync(cancellationToken);
                            await _notifications.NotifyPaymentFailedAsync(tx.TenantId, plan ?? tx.SubscriptionPlanCode, cancellationToken);
                        }

                        await _db.SaveChangesAsync(cancellationToken);
                        _logger.LogInformation("PayMongo webhook processed: {Event} session {Session} payment {Payment} status {Status}",
                            eventType, checkoutSessionId, tx.Id, tx.Status);
                    }
                    else
                    {
                        _logger.LogWarning("PayMongo webhook: no PaymentTransaction for session {Session}", checkoutSessionId);
                    }
                }
                else
                {
                    _logger.LogWarning("PayMongo webhook: could not resolve checkout session id from payload.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PayMongo webhook processing error.");
            }

            return Ok(new { received = true });
        }

        private async Task ActivateSubscriptionAsync(PaymentTransaction tx, CancellationToken cancellationToken)
        {
            var plan = await _db.Plans.FirstOrDefaultAsync(p => p.Id == tx.PlanId, cancellationToken);
            if (plan == null) return;

            var tenantRow = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tx.TenantId, cancellationToken);
            if (tenantRow == null) return;

            var now = DateTime.UtcNow;
            var cycle = string.Equals(tx.BillingCycle, "Yearly", StringComparison.OrdinalIgnoreCase)
                ? BillingCycle.Yearly
                : BillingCycle.Monthly;

            var endDate = cycle == BillingCycle.Yearly ? now.AddDays(365) : now.AddDays(30);

            // Expire any previous active subscription for this tenant
            var previousSubs = await _db.TenantSubscriptions
                .Where(s => s.TenantId == tx.TenantId
                    && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Expiring))
                .ToListAsync(cancellationToken);
            foreach (var prev in previousSubs)
            {
                prev.Status = SubscriptionStatus.Expired;
                prev.UpdatedAt = now;
            }

            // Create the new subscription record
            var subscription = new TenantSubscription
            {
                TenantId = tx.TenantId,
                PlanId = plan.Id,
                BillingCycle = cycle,
                StartDate = now,
                EndDate = endDate,
                Status = SubscriptionStatus.Active,
                PaymentTransactionId = tx.Id,
                IsFreePlan = false
            };
            _db.TenantSubscriptions.Add(subscription);

            // Update tenant's active plan and limits
            tenantRow.PlanId = plan.Id;
            tenantRow.MaxRooms = plan.MaxRooms;
            tenantRow.MaxPersonnel = plan.MaxPersonnel;
            tenantRow.AssetTracking = plan.AssetTracking;
            tenantRow.Depreciation = plan.Depreciation;
            tenantRow.MaintenanceModule = plan.MaintenanceModule;
            tenantRow.UpdatedAt = now;

            // Activate org if it was awaiting payment from the registration flow
            if (string.Equals(tenantRow.Status, "PendingPayment", StringComparison.OrdinalIgnoreCase))
                tenantRow.Status = "Active";

            await _notifications.NotifySubscriptionActivatedAsync(
                tx.TenantId, plan.Name, cycle.ToString(), endDate, cancellationToken);
        }

        private static bool VerifyWebhookSignature(string? header, string body, string secret)
        {
            if (string.IsNullOrEmpty(header)) return false;

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
            var hex = Convert.ToHexString(hash).ToLowerInvariant();

            if (header.Contains(hex, StringComparison.OrdinalIgnoreCase))
                return true;

            foreach (var part in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length == 2 && kv[0].Trim().Equals("v1", StringComparison.OrdinalIgnoreCase))
                {
                    var sig = kv[1].Trim();
                    if (sig.Equals(hex, StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }

            return false;
        }

        private static bool TryFindCheckoutSessionId(JsonElement el, out string? id)
        {
            id = null;
            switch (el.ValueKind)
            {
                case JsonValueKind.Object:
                    foreach (var p in el.EnumerateObject())
                    {
                        if (p.NameEquals("id") && p.Value.ValueKind == JsonValueKind.String)
                        {
                            var s = p.Value.GetString();
                            if (!string.IsNullOrEmpty(s) && s.StartsWith("cs_", StringComparison.Ordinal))
                            {
                                id = s;
                                return true;
                            }
                        }

                        if (TryFindCheckoutSessionId(p.Value, out var nested) && nested != null)
                        {
                            id = nested;
                            return true;
                        }
                    }
                    break;
                case JsonValueKind.Array:
                    foreach (var item in el.EnumerateArray())
                    {
                        if (TryFindCheckoutSessionId(item, out var nested) && nested != null)
                        {
                            id = nested;
                            return true;
                        }
                    }
                    break;
            }

            return id != null;
        }

        /// <summary>
        /// Anonymous endpoint for the registration payment-return page to poll payment status.
        /// Returns only the minimal fields needed for UI feedback — no tenant PII is exposed.
        /// </summary>
        [HttpGet("registration/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRegistrationPaymentStatus(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest();

            var tx = await _db.PaymentTransactions
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

            if (tx == null)
                return NotFound();

            return Ok(new RegistrationPaymentStatusDto
            {
                Status = tx.Status,
                PlanName = tx.SubscriptionPlanCode,
                AmountCents = tx.AmountCents,
                Currency = tx.Currency
            });
        }

        /// <summary>
        /// Anonymous endpoint: verify registration payment by querying PayMongo directly.
        /// Called by the payment-return page after redirect from PayMongo checkout.
        /// Idempotent — activates the subscription if PayMongo reports the session as paid
        /// and the subscription has not yet been activated (e.g. webhook has not fired yet).
        /// </summary>
        [HttpPost("registration/{id}/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyRegistrationPayment(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest();

            var tx = await _db.PaymentTransactions
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

            if (tx == null)
                return NotFound();

            // Already processed — return current status without re-querying PayMongo
            if (!string.Equals(tx.Status, "Pending", StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new RegistrationPaymentStatusDto
                {
                    Status = tx.Status,
                    PlanName = tx.SubscriptionPlanCode,
                    AmountCents = tx.AmountCents,
                    Currency = tx.Currency
                });
            }

            // No checkout session to verify against
            if (string.IsNullOrEmpty(tx.CheckoutSessionId))
            {
                return Ok(new RegistrationPaymentStatusDto
                {
                    Status = tx.Status,
                    PlanName = tx.SubscriptionPlanCode,
                    AmountCents = tx.AmountCents,
                    Currency = tx.Currency
                });
            }

            var sessionResult = await _payMongo.GetCheckoutSessionStatusAsync(tx.CheckoutSessionId, cancellationToken);

            if (sessionResult.Ok)
            {
                if (string.Equals(sessionResult.Status, "paid", StringComparison.OrdinalIgnoreCase))
                {
                    tx.Status = "Paid";
                    tx.UpdatedAt = DateTime.UtcNow;
                    await ActivateSubscriptionAsync(tx, cancellationToken);
                    await _db.SaveChangesAsync(cancellationToken);
                }
                else if (string.Equals(sessionResult.Status, "expired", StringComparison.OrdinalIgnoreCase))
                {
                    tx.Status = "Expired";
                    tx.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync(cancellationToken);
                }
            }
            else
            {
                _logger.LogWarning("VerifyRegistrationPayment: PayMongo query failed for session {SessionId}: {Error}",
                    tx.CheckoutSessionId, sessionResult.ErrorMessage);
            }

            return Ok(new RegistrationPaymentStatusDto
            {
                Status = tx.Status,
                PlanName = tx.SubscriptionPlanCode,
                AmountCents = tx.AmountCents,
                Currency = tx.Currency
            });
        }

        private static PaymentTransactionResponseDto Map(PaymentTransaction t) => new()
        {
            Id = t.Id,
            TenantId = t.TenantId,
            AmountCents = t.AmountCents,
            Currency = t.Currency,
            Description = t.Description,
            Status = t.Status,
            CheckoutSessionId = t.CheckoutSessionId,
            ReferenceNumber = t.ReferenceNumber,
            SubscriptionPlanCode = t.SubscriptionPlanCode,
            LastError = t.LastError,
            LastEventType = t.LastEventType,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };
    }

}
