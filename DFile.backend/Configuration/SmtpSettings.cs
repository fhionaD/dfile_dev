namespace DFile.backend.Configuration
{
    public class SmtpSettings
    {
        public required string Host { get; set; }
        public int Port { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
    }
}