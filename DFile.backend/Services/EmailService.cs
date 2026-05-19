using DFile.backend.Configuration;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

namespace DFile.backend.Services
{
    public class EmailService : IEmailService
    {
        private readonly SmtpSettings _smtp;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<SmtpSettings> smtpOptions, ILogger<EmailService> logger)
        {
            _smtp = smtpOptions.Value;
            _logger = logger;
        }

        public async Task SendEmailAsync(string recipient, string subject, string html)
        {
            using var client = new SmtpClient(_smtp.Host, _smtp.Port)
            {
                Credentials = new NetworkCredential(_smtp.Email, _smtp.Password),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            using var message = new MailMessage
            {
                From = new MailAddress(_smtp.Email, "DFile System"),
                Subject = subject,
                Body = html,
                IsBodyHtml = true
            };
            message.To.Add(recipient);

            try
            {
                await client.SendMailAsync(message);
                _logger.LogInformation("Email sent to {Recipient} with subject '{Subject}'", recipient, subject);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Recipient}", recipient);
                throw;
            }
        }

        public async Task SendLoginSuccessNotificationAsync(string recipient, string firstName, string? ipAddress, string? userAgent, bool isNewDevice)
        {
            var deviceNote = isNewDevice
                ? "<p style='color:#c0392b;font-weight:bold;'>âš ï¸ This was from an unrecognized device or location.</p>"
                : "";

            var html = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:24px;border-radius:8px;'>
  <h2 style='color:#2c3e50;'>âœ… Successful Login â€” DFile</h2>
  <p>Hi <strong>{firstName}</strong>,</p>
  <p>A successful login was recorded on your account.</p>
  {deviceNote}
  <table style='width:100%;border-collapse:collapse;margin:16px 0;'>
    <tr><td style='padding:8px;background:#ecf0f1;font-weight:bold;width:40%;'>Time (UTC)</td><td style='padding:8px;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
    <tr><td style='padding:8px;background:#ecf0f1;font-weight:bold;'>IP Address</td><td style='padding:8px;'>{ipAddress ?? "Unknown"}</td></tr>
    <tr><td style='padding:8px;background:#ecf0f1;font-weight:bold;'>Device / Browser</td><td style='padding:8px;'>{TruncateUserAgent(userAgent)}</td></tr>
  </table>
  <p>If this was not you, please change your password immediately and contact support.</p>
  <p style='font-size:12px;color:#7f8c8d;'>â€” DFile Security Team</p>
</div>";
            await SendEmailAsync(recipient, "DFile â€” Successful Login Detected", html);
        }

        public async Task SendLoginSecurityAlertAsync(string recipient, string firstName, string? ipAddress, string? userAgent, int failedAttempts)
        {
            var html = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff3f3;padding:24px;border-radius:8px;border:2px solid #e74c3c;'>
  <h2 style='color:#c0392b;'>ðŸš¨ Suspicious Login Activity â€” DFile</h2>
  <p>Hi <strong>{firstName}</strong>,</p>
  <p>We have detected <strong>{failedAttempts} failed login attempt(s)</strong> on your account. This may indicate unauthorized access.</p>
  <table style='width:100%;border-collapse:collapse;margin:16px 0;'>
    <tr><td style='padding:8px;background:#fadbd8;font-weight:bold;width:40%;'>Time (UTC)</td><td style='padding:8px;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
    <tr><td style='padding:8px;background:#fadbd8;font-weight:bold;'>IP Address</td><td style='padding:8px;'>{ipAddress ?? "Unknown"}</td></tr>
    <tr><td style='padding:8px;background:#fadbd8;font-weight:bold;'>Device / Browser</td><td style='padding:8px;'>{TruncateUserAgent(userAgent)}</td></tr>
    <tr><td style='padding:8px;background:#fadbd8;font-weight:bold;'>Failed Attempts</td><td style='padding:8px;'>{failedAttempts} of 5</td></tr>
  </table>
  <p><strong>If this was not you, secure your account immediately by resetting your password.</strong></p>
  <p style='font-size:12px;color:#7f8c8d;'>â€” DFile Security Team</p>
</div>";
            await SendEmailAsync(recipient, "DFile â€” Suspicious Login Activity Detected", html);
        }

        public async Task SendNewDeviceLoginAlertAsync(string recipient, string firstName, string? ipAddress, string? userAgent)
        {
            var html = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fffbe6;padding:24px;border-radius:8px;border:2px solid #f39c12;'>
  <h2 style='color:#d68910;'>ðŸ”” New Device Login â€” DFile</h2>
  <p>Hi <strong>{firstName}</strong>,</p>
  <p>Your account was accessed from a new or unrecognized device.</p>
  <table style='width:100%;border-collapse:collapse;margin:16px 0;'>
    <tr><td style='padding:8px;background:#fdebd0;font-weight:bold;width:40%;'>Time (UTC)</td><td style='padding:8px;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
    <tr><td style='padding:8px;background:#fdebd0;font-weight:bold;'>IP Address</td><td style='padding:8px;'>{ipAddress ?? "Unknown"}</td></tr>
    <tr><td style='padding:8px;background:#fdebd0;font-weight:bold;'>Device / Browser</td><td style='padding:8px;'>{TruncateUserAgent(userAgent)}</td></tr>
  </table>
  <p>If this was not you, please reset your password and contact support.</p>
  <p style='font-size:12px;color:#7f8c8d;'>â€” DFile Security Team</p>
</div>";
            await SendEmailAsync(recipient, "DFile â€” New Device Login Detected", html);
        }

        private static string TruncateUserAgent(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
            return userAgent.Length > 120 ? userAgent[..120] + "..." : userAgent;
        }

    }
}
