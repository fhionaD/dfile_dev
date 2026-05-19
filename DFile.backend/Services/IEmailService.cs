namespace DFile.backend.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string recipient, string subject, string html);
        Task SendLoginSuccessNotificationAsync(string recipient, string firstName, string? ipAddress, string? userAgent, bool isNewDevice);
        Task SendLoginSecurityAlertAsync(string recipient, string firstName, string? ipAddress, string? userAgent, int failedAttempts);
        Task SendNewDeviceLoginAlertAsync(string recipient, string firstName, string? ipAddress, string? userAgent);
    }
}