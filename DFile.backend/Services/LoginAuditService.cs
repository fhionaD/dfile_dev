using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace DFile.backend.Services
{
    public class LoginAuditService : ILoginAuditService
    {
        private const int MaxFailedAttempts = 5;
        private const int CooldownMinutes = 15;
        private const int SuspiciousThreshold = 3;

        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<LoginAuditService> _logger;

        public LoginAuditService(AppDbContext context, IEmailService emailService, ILogger<LoginAuditService> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<bool> IsLockedOutAsync(User user)
        {
            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
                return true;

            // Clear expired lockout
            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value <= DateTime.UtcNow)
            {
                user.LockoutEnd = null;
                user.FailedLoginAttempts = 0;
                try { await _context.SaveChangesAsync(); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to clear expired lockout for user {UserId}", user.Id); }
            }

            return false;
        }

        public async Task<LoginAttemptResult> RecordFailedAttemptAsync(User user, string? ipAddress, string? userAgent, string reason)
        {
            user.FailedLoginAttempts++;
            bool isSuspicious = user.FailedLoginAttempts >= SuspiciousThreshold;
            bool isNowLocked = false;
            bool securityAlertSent = false;

            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(CooldownMinutes);
                isNowLocked = true;
            }

            try { await _context.SaveChangesAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to save failed-attempt count for user {UserId}", user.Id); }

            var audit = new UserLoginAudit
            {
                UserId = user.Id,
                Email = user.Email,
                AttemptStatus = isNowLocked ? "LOGIN_LOCKED" : (isSuspicious ? "SUSPICIOUS_LOGIN" : "LOGIN_FAILED"),
                IpAddress = ipAddress,
                UserAgent = userAgent,
                AttemptedAt = DateTime.UtcNow,
                FailureReason = reason,
                IsSuspicious = isSuspicious,
                TenantId = user.TenantId
            };
            _context.UserLoginAudits.Add(audit);
            try { await _context.SaveChangesAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to save login audit record for user {UserId}", user.Id); }

            // Send security alert on suspicious threshold
            if (isSuspicious)
            {
                try
                {
                    await _emailService.SendLoginSecurityAlertAsync(user.Email, user.FirstName, ipAddress, userAgent, user.FailedLoginAttempts);
                    securityAlertSent = true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send security alert email to {Email}", user.Email);
                }
            }

            int attemptsLeft = Math.Max(0, MaxFailedAttempts - user.FailedLoginAttempts);

            return new LoginAttemptResult
            {
                AttemptsLeft = attemptsLeft,
                CooldownMinutes = isNowLocked ? CooldownMinutes : 0,
                IsLocked = isNowLocked,
                IsSuspicious = isSuspicious,
                SecurityAlertSent = securityAlertSent
            };
        }

        public async Task RecordSuccessAsync(User user, string? ipAddress, string? userAgent)
        {
            var audit = new UserLoginAudit
            {
                UserId = user.Id,
                Email = user.Email,
                AttemptStatus = "LOGIN_SUCCESS",
                IpAddress = ipAddress,
                UserAgent = userAgent,
                AttemptedAt = DateTime.UtcNow,
                IsSuspicious = false,
                TenantId = user.TenantId
            };
            _context.UserLoginAudits.Add(audit);
            try { await _context.SaveChangesAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to save login success audit for user {UserId}", user.Id); }
        }

        public async Task ResetFailedAttemptsAsync(User user)
        {
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            try { await _context.SaveChangesAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to reset failed attempts for user {UserId}", user.Id); }
        }

        public string GenerateDeviceFingerprint(string? userAgent, string? ipAddress)
        {
            var raw = $"{userAgent ?? "unknown"}|{ipAddress ?? "unknown"}";
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes)[..32].ToLowerInvariant();
        }

        public async Task<bool> IsKnownDeviceAsync(int userId, string fingerprint)
        {
            return await _context.TrustedDevices
                .AnyAsync(d => d.UserId == userId && d.DeviceFingerprint == fingerprint);
        }

        public async Task SaveTrustedDeviceAsync(int userId, string fingerprint, string? ipAddress, string? userAgent)
        {
            var existing = await _context.TrustedDevices
                .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceFingerprint == fingerprint);

            if (existing != null)
            {
                existing.LastUsedAt = DateTime.UtcNow;
                existing.IpAddress = ipAddress;
            }
            else
            {
                _context.TrustedDevices.Add(new TrustedDevice
                {
                    UserId = userId,
                    DeviceFingerprint = fingerprint,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    LastUsedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });
            }

            try { await _context.SaveChangesAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to save trusted device for user {UserId}", userId); }
        }
    }
}
