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
        private readonly PayMongoOptions _payMongoOpts;
        private readonly PaymentAppOptions _paymentApp;
        private readonly ILogger<PaymentsController> _logger;

        public PaymentsController(
            AppDbContext db,
            IPayMongoPaymentService payMongo,
            ITenantContext tenant,
            IOptions<PayMongoOptions> payMongoOpts,
            IOptions<PaymentAppOptions> paymentApp,
            ILogger<PaymentsController> logger)
        {
            _db = db;
            _payMongo = payMongo;
            _tenant = tenant;
            _payMongoOpts = payMongoOpts.Value;
            _paymentApp = paymentApp.Value;
            _logger = logger;
        }

        /// <summary>Subscription tiers and amounts (server-defined test pricing).</summary>
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

            var plans = Enum.GetValues<SubscriptionPlanType>()
                .Select(p => new BillingPlanOptionDto
                {
                    Plan = (int)p,
                    Code = p.ToString(),
                    DisplayName = p.ToString(),
                    PricePesos = SubscriptionBillingPricing.GetPricePesos(p),
                    AmountCents = SubscriptionBillingPricing.GetAmountCentavos(p),
                    Summary = SubscriptionBillingPricing.GetSummary(p)
                })
                .ToList();

            return Ok(new BillingPlansResponseDto
            {
                CurrentPlanCode = tenantEntity.SubscriptionPlan.ToString(),
                CurrentPlan = (int)tenantEntity.SubscriptionPlan,
                Plans = plans
            });
        }

        /// <summary>Tenant Admin only — creates hosted checkout session (PayMongo).</summary>
        [HttpPost("paymongo/checkout")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PayMongoCheckoutResponseDto>> CreatePayMongoCheckout(
            [FromBody] CreatePayMongoCheckoutDto? dto,
            CancellationToken cancellationToken)
        {
            if (!_tenant.TenantId.HasValue || _tenant.IsSuperAdmin)
                return Forbid();

            var tenantId = _tenant.TenantId.Value;
            var tenantEntity = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            if (tenantEntity == null)
                return BadRequest(new { message = "Organization not found." });

            SubscriptionPlanType targetPlan;
            if (dto?.SubscriptionPlan is { } requested &&
                Enum.IsDefined(typeof(SubscriptionPlanType), requested))
                targetPlan = (SubscriptionPlanType)requested;
            else
                targetPlan = tenantEntity.SubscriptionPlan;

            var amount = SubscriptionBillingPricing.GetAmountCentavos(targetPlan);
            var planLabel = targetPlan.ToString();
            var description = $"DFile {planLabel} subscription";

            var payment = new PaymentTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                AmountCents = amount,
                Currency = "PHP",
                Description = description,
                SubscriptionPlanCode = planLabel,
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
                ["tenant_id"] = tenantId.ToString(),
                ["payment_transaction_id"] = payment.Id,
                ["subscription_plan"] = planLabel
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

            if (!string.IsNullOrEmpty(_payMongoOpts.WebhookSecret))
            {
                if (!VerifyWebhookSignature(sigHeader, body, _payMongoOpts.WebhookSecret))
                {
                    _logger.LogWarning("PayMongo webhook signature verification failed.");
                    return Unauthorized();
                }
            }
            else
            {
                _logger.LogInformation("PayMongo webhook received without WebhookSecret configured; signature not verified.");
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

                        var et = eventType ?? "";
                        if (et.Contains("checkout_session.payment.paid", StringComparison.OrdinalIgnoreCase)
                            || (et.Contains("paid", StringComparison.OrdinalIgnoreCase) && et.Contains("checkout", StringComparison.OrdinalIgnoreCase))
                            || et.Equals("payment.paid", StringComparison.OrdinalIgnoreCase))
                            tx.Status = "Paid";
                        else if (et.Contains("payment.failed", StringComparison.OrdinalIgnoreCase) || et.Equals("payment.failed", StringComparison.OrdinalIgnoreCase))
                            tx.Status = "Failed";
                        else if (et.Contains("expired", StringComparison.OrdinalIgnoreCase))
                            tx.Status = "Expired";

                        if (string.Equals(tx.Status, "Paid", StringComparison.OrdinalIgnoreCase) && !wasPaid
                            && !string.IsNullOrEmpty(tx.SubscriptionPlanCode)
                            && Enum.TryParse<SubscriptionPlanType>(tx.SubscriptionPlanCode, ignoreCase: true, out var paidPlan))
                        {
                            var tenantRow = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tx.TenantId, cancellationToken);
                            if (tenantRow != null)
                            {
                                tenantRow.SubscriptionPlan = paidPlan;
                                tenantRow.UpdatedAt = DateTime.UtcNow;
                            }
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
