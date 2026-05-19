using System.Text.RegularExpressions;

namespace DFile.backend.Helpers
{
    public static class PasswordHelper
    {
        private static readonly Regex UpperCase = new(@"[A-Z]", RegexOptions.Compiled);
        private static readonly Regex LowerCase = new(@"[a-z]", RegexOptions.Compiled);
        private static readonly Regex Digit     = new(@"\d",    RegexOptions.Compiled);
        private static readonly Regex Special   = new(@"[^a-zA-Z0-9]", RegexOptions.Compiled);

        public static (bool IsValid, string? ErrorMessage) Validate(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return (false, "Password is required.");

            if (password.Length < 8)
                return (false, "Password must be at least 8 characters.");

            if (!UpperCase.IsMatch(password))
                return (false, "Password must contain at least one uppercase letter.");

            if (!LowerCase.IsMatch(password))
                return (false, "Password must contain at least one lowercase letter.");

            if (!Digit.IsMatch(password))
                return (false, "Password must contain at least one number.");

            if (!Special.IsMatch(password))
                return (false, "Password must contain at least one special character.");

            return (true, null);
        }
    }
}
