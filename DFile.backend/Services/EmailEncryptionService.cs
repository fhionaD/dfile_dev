using System.Security.Cryptography;
using System.Text;

namespace DFile.backend.Services
{
    /// <summary>
    /// AES-256-GCM email encryption with HMAC-SHA256 deterministic hashing for lookup.
    ///
    /// Storage format: base64(12-byte nonce) + "." + base64(ciphertext) + "." + base64(16-byte tag)
    ///
    /// Configuration: EmailEncryption:Key — a 32-byte (256-bit) base64-encoded key.
    /// Generate with: Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
    /// </summary>
    public class EmailEncryptionService : IEmailEncryptionService
    {
        private const int NonceSize = 12; // 96-bit nonce (recommended for AES-GCM)
        private const int TagSize = 16;   // 128-bit authentication tag

        private readonly byte[] _key;

        public EmailEncryptionService(IConfiguration configuration)
        {
            var keyBase64 = configuration["EmailEncryption:Key"];

            if (string.IsNullOrWhiteSpace(keyBase64))
                throw new InvalidOperationException(
                    "FATAL: EmailEncryption:Key is not configured. " +
                    "Set a 32-byte base64-encoded key via the EmailEncryption__Key environment variable or appsettings.");

            byte[] key;
            try
            {
                key = Convert.FromBase64String(keyBase64);
            }
            catch (FormatException)
            {
                throw new InvalidOperationException("EmailEncryption:Key is not a valid base64 string.");
            }

            if (key.Length != 32)
                throw new InvalidOperationException(
                    $"EmailEncryption:Key must be exactly 32 bytes (256 bits). Current length: {key.Length} bytes.");

            _key = key;
        }

        /// <inheritdoc/>
        public string Encrypt(string plainEmail)
        {
            if (string.IsNullOrEmpty(plainEmail))
                return string.Empty;

            var plainBytes = Encoding.UTF8.GetBytes(plainEmail);
            var nonce = new byte[NonceSize];
            RandomNumberGenerator.Fill(nonce);

            var cipherText = new byte[plainBytes.Length];
            var tag = new byte[TagSize];

            using var aes = new AesGcm(_key, TagSize);
            aes.Encrypt(nonce, plainBytes, cipherText, tag);

            return $"{Convert.ToBase64String(nonce)}.{Convert.ToBase64String(cipherText)}.{Convert.ToBase64String(tag)}";
        }

        /// <inheritdoc/>
        public string Decrypt(string encryptedEmail)
        {
            if (string.IsNullOrEmpty(encryptedEmail))
                return string.Empty;

            var parts = encryptedEmail.Split('.');
            if (parts.Length != 3)
                throw new FormatException($"Invalid encrypted email format: expected 3 dot-separated base64 segments, got {parts.Length}.");

            var nonce = Convert.FromBase64String(parts[0]);
            var cipherText = Convert.FromBase64String(parts[1]);
            var tag = Convert.FromBase64String(parts[2]);

            var plainBytes = new byte[cipherText.Length];

            using var aes = new AesGcm(_key, TagSize);
            aes.Decrypt(nonce, cipherText, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }

        /// <inheritdoc/>
        public string Hash(string normalizedEmail)
        {
            if (string.IsNullOrEmpty(normalizedEmail))
                return string.Empty;

            using var hmac = new HMACSHA256(_key);
            var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(normalizedEmail));
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }
    }
}
