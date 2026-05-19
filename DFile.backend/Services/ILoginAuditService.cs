using DFile.backend.Models;

namespace DFile.backend.Services
{
    public interface ILoginAuditService
    {
        Task<LoginAttemptResult> RecordFailedAttemptAsync(User user, string? ipAddress, string? userAgent, string reason);
        Task RecordSuccessAsync(User user, string? ipAddress, string? userAgent);
        Task<bool> IsLockedOutAsync(User user);
        Task ResetFailedAttemptsAsync(User user);
        string GenerateDeviceFingerprint(string? userAgent, string? ipAddress);
        Task<bool> IsKnownDeviceAsync(int userId, string fingerprint);
        Task SaveTrustedDeviceAsync(int userId, string fingerprint, string? ipAddress, string? userAgent);
    }

    public class LoginAttemptResult
    {
        public int AttemptsLeft { get; set; }
        public int CooldownMinutes { get; set; }
        public bool IsLocked { get; set; }
        public bool IsSuspicious { get; set; }
        public bool SecurityAlertSent { get; set; }
    }
}
