namespace DFile.backend.Services
{
    /// <summary>
    /// Provides AES-256-GCM encryption for email addresses stored in the database and
    /// a deterministic HMAC-SHA256 hash for fast indexed lookups without exposing plaintext.
    /// </summary>
    public interface IEmailEncryptionService
    {
        /// <summary>Encrypts a normalized (lowercase) email using AES-256-GCM. Returns a base64-encoded "nonce.ciphertext.tag" string.</summary>
        string Encrypt(string plainEmail);

        /// <summary>Decrypts an AES-256-GCM encrypted email back to its plaintext form.</summary>
        string Decrypt(string encryptedEmail);

        /// <summary>Computes a deterministic HMAC-SHA256 hex hash of the normalized email. Used for exact-match database lookups.</summary>
        string Hash(string normalizedEmail);
    }
}
