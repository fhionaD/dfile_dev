using DFile.backend.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

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
            if (string.IsNullOrWhiteSpace(_smtp.Email) || string.IsNullOrWhiteSpace(_smtp.Host))
            {
                _logger.LogWarning("Email not sent to {Recipient}: SMTP is not configured (SmtpSettings__Email or SmtpSettings__Host missing).", recipient);
                return;
            }

            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("DFile System", _smtp.Email));
                message.To.Add(new MailboxAddress(string.Empty, recipient));
                message.Subject = subject;
                message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(_smtp.Host, _smtp.Port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtp.Email, _smtp.Password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Email sent to {Recipient} with subject '{Subject}'", recipient, subject);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Recipient}", recipient);
            }
        }

        public async Task SendLoginSuccessNotificationAsync(string recipient, string firstName, string? ipAddress, string? userAgent, bool isNewDevice)
        {
            var deviceNote = isNewDevice
                ? "<p style='color:#c0392b;font-weight:bold;'>This login originated from an unrecognized device or location.</p>"
                : "";

            var html = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:4px;border:1px solid #d0d0d0;'>
  <div style='border-bottom:2px solid #2c3e50;padding-bottom:16px;margin-bottom:24px;'>
    <h2 style='color:#2c3e50;margin:0;font-size:18px;letter-spacing:0.5px;'>DFILE SECURITY NOTIFICATION</h2>
    <p style='color:#7f8c8d;margin:4px 0 0;font-size:12px;'>Successful Login Alert</p>
  </div>
  <p>Dear <strong>{firstName}</strong>,</p>
  <p>A successful login was recorded on your DFile account. Please review the details below.</p>
  {deviceNote}
  <table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;'>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;width:40%;border:1px solid #d5d8dc;'>Time (UTC)</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>IP Address</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{ipAddress ?? "Unknown"}</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>Device / Browser</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{TruncateUserAgent(userAgent)}</td></tr>
  </table>
  <p>If you did not initiate this login, change your password immediately and contact your system administrator.</p>
  <p style='font-size:12px;color:#7f8c8d;margin-top:32px;border-top:1px solid #d0d0d0;padding-top:12px;'>This is an automated security notification from DFile. Please do not reply to this message.<br>DFile Security Team</p>
</div>";
            await SendEmailAsync(recipient, "DFile - Successful Login Notification", html);
        }

        public async Task SendLoginSecurityAlertAsync(string recipient, string firstName, string? ipAddress, string? userAgent, int failedAttempts)
        {
            var html = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:4px;border:1px solid #d0d0d0;'>
  <div style='border-bottom:2px solid #c0392b;padding-bottom:16px;margin-bottom:24px;'>
    <h2 style='color:#c0392b;margin:0;font-size:18px;letter-spacing:0.5px;'>DFILE SECURITY ALERT</h2>
    <p style='color:#7f8c8d;margin:4px 0 0;font-size:12px;'>Suspicious Login Activity Detected</p>
  </div>
  <p>Dear <strong>{firstName}</strong>,</p>
  <p>We have detected <strong>{failedAttempts} failed login attempt(s)</strong> on your account. This may indicate an unauthorized access attempt.</p>
  <table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;'>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;width:40%;border:1px solid #d5d8dc;'>Time (UTC)</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>IP Address</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{ipAddress ?? "Unknown"}</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>Device / Browser</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{TruncateUserAgent(userAgent)}</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>Failed Attempts</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{failedAttempts} of 5</td></tr>
  </table>
  <p><strong>If you did not initiate these attempts, secure your account immediately by resetting your password.</strong></p>
  <p style='font-size:12px;color:#7f8c8d;margin-top:32px;border-top:1px solid #d0d0d0;padding-top:12px;'>This is an automated security notification from DFile. Please do not reply to this message.<br>DFile Security Team</p>
</div>";
            await SendEmailAsync(recipient, "DFile - Suspicious Login Activity Detected", html);
        }

        public async Task SendNewDeviceLoginAlertAsync(string recipient, string firstName, string? ipAddress, string? userAgent)
        {
            var html = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:4px;border:1px solid #d0d0d0;'>
  <div style='border-bottom:2px solid #1a5276;padding-bottom:16px;margin-bottom:24px;'>
    <h2 style='color:#1a5276;margin:0;font-size:18px;letter-spacing:0.5px;'>DFILE SECURITY NOTIFICATION</h2>
    <p style='color:#7f8c8d;margin:4px 0 0;font-size:12px;'>New Device Login Detected</p>
  </div>
  <p>Dear <strong>{firstName}</strong>,</p>
  <p>Your DFile account was accessed from a new or unrecognized device. Please review the details below.</p>
  <table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;'>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;width:40%;border:1px solid #d5d8dc;'>Time (UTC)</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>IP Address</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{ipAddress ?? "Unknown"}</td></tr>
    <tr><td style='padding:10px 12px;background:#f4f6f7;font-weight:bold;border:1px solid #d5d8dc;'>Device / Browser</td><td style='padding:10px 12px;border:1px solid #d5d8dc;'>{TruncateUserAgent(userAgent)}</td></tr>
  </table>
  <p>If you did not initiate this login, reset your password immediately and notify your system administrator.</p>
  <p style='font-size:12px;color:#7f8c8d;margin-top:32px;border-top:1px solid #d0d0d0;padding-top:12px;'>This is an automated security notification from DFile. Please do not reply to this message.<br>DFile Security Team</p>
</div>";
            await SendEmailAsync(recipient, "DFile - New Device Login Detected", html);
        }

        private static string TruncateUserAgent(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
            return userAgent.Length > 120 ? userAgent[..120] + "..." : userAgent;
        }

    }
}
