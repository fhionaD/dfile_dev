namespace DFile.backend.Configuration
{
    public class PayMongoOptions
    {
        public const string SectionName = "PayMongo";

        /// <summary>From PAYMONGO_SECRET_KEY or PayMongo:SecretKey — server only (use live keys in production).</summary>
        public string SecretKey { get; set; } = string.Empty;

        /// <summary>From PAYMONGO_PUBLIC_KEY or PayMongo:PublicKey.</summary>
        public string PublicKey { get; set; } = string.Empty;

        public string? WebhookSecret { get; set; }
    }

    public class PaymentAppOptions
    {
        public const string SectionName = "Payment";

        /// <summary>Absolute base URL for success/cancel redirects (e.g. https://app.example.com).</summary>
        public string AppBaseUrl { get; set; } = "http://localhost:3000";
    }
}
