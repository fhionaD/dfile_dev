using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DFile.backend.Configuration;
using Microsoft.Extensions.Options;

namespace DFile.backend.Services
{
    public interface IPayMongoPaymentService
    {
        Task<PayMongoCheckoutResult> CreateCheckoutSessionAsync(
            int amountCents,
            string description,
            string referenceNumber,
            string successUrl,
            string cancelUrl,
            IReadOnlyDictionary<string, string>? metadata,
            CancellationToken cancellationToken = default);
    }

    public sealed record PayMongoCheckoutResult(bool Ok, string? CheckoutUrl, string? CheckoutSessionId, string? ErrorMessage);

    public class PayMongoPaymentService : IPayMongoPaymentService
    {
        private readonly HttpClient _http;
        private readonly PayMongoOptions _options;
        private readonly ILogger<PayMongoPaymentService> _logger;

        public PayMongoPaymentService(
            HttpClient http,
            IOptions<PayMongoOptions> options,
            ILogger<PayMongoPaymentService> logger)
        {
            _http = http;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<PayMongoCheckoutResult> CreateCheckoutSessionAsync(
            int amountCents,
            string description,
            string referenceNumber,
            string successUrl,
            string cancelUrl,
            IReadOnlyDictionary<string, string>? metadata,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_options.SecretKey))
            {
                _logger.LogWarning("PayMongo SecretKey is not configured.");
                return new PayMongoCheckoutResult(false, null, null, "PayMongo is not configured.");
            }

            var itemName = string.IsNullOrWhiteSpace(description) ? "DFile subscription" : description[..Math.Min(description.Length, 255)];
            var desc = string.IsNullOrWhiteSpace(description) ? "DFile organization subscription" : description[..Math.Min(description.Length, 255)];

            var lineItem = new JsonObject
            {
                ["amount"] = amountCents,
                ["currency"] = "PHP",
                ["name"] = itemName,
                ["quantity"] = 1
            };

            var paymentTypes = new JsonArray { "card" };

            var attributes = new JsonObject
            {
                ["line_items"] = new JsonArray { lineItem },
                ["payment_method_types"] = paymentTypes,
                ["success_url"] = successUrl,
                ["cancel_url"] = cancelUrl,
                ["reference_number"] = referenceNumber,
                ["description"] = desc,
                ["send_email_receipt"] = false
            };

            if (metadata is { Count: > 0 })
            {
                var meta = new JsonObject();
                foreach (var kv in metadata)
                    meta[kv.Key] = kv.Value;
                attributes["metadata"] = meta;
            }

            var root = new JsonObject
            {
                ["data"] = new JsonObject
                {
                    ["type"] = "checkout_session",
                    ["attributes"] = attributes
                }
            };

            var json = root.ToJsonString(new JsonSerializerOptions { WriteIndented = false });

            using var req = new HttpRequestMessage(HttpMethod.Post, "v1/checkout_sessions");
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");
            var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.SecretKey}:"));
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);

            try
            {
                var resp = await _http.SendAsync(req, cancellationToken);
                var body = await resp.Content.ReadAsStringAsync(cancellationToken);

                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("PayMongo checkout_sessions failed: {Status} {Body}", (int)resp.StatusCode, body);
                    return new PayMongoCheckoutResult(false, null, null, $"PayMongo error: {(int)resp.StatusCode}");
                }

                using var doc = JsonDocument.Parse(body);
                var data = doc.RootElement.GetProperty("data");
                var sessionId = data.GetProperty("id").GetString();
                var checkoutUrl = data.GetProperty("attributes").GetProperty("checkout_url").GetString();

                return new PayMongoCheckoutResult(true, checkoutUrl, sessionId, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PayMongo checkout_sessions request failed.");
                return new PayMongoCheckoutResult(false, null, null, ex.Message);
            }
        }
    }
}
