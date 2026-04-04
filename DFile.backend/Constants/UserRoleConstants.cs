namespace DFile.backend.Constants
{
    public static class UserRoleConstants
    {
        public const string SuperAdmin = "Super Admin";
        public const string Admin = "Admin";
        public const string Finance = "Finance";
        public const string Maintenance = "Maintenance";
        public const string Procurement = "Procurement";
        public const string Employee = "Employee";

        public static readonly string[] All =
        {
            SuperAdmin, Admin, Finance, Maintenance, Procurement, Employee
        };

        public static bool IsKnownName(string name) =>
            Array.Exists(All, x => string.Equals(x, name, StringComparison.Ordinal));

        /// <summary>
        /// Maps tenant role template names on the user <c>Role</c> column to JWT/policy names
        /// so <c>User.IsInRole("Finance")</c> matches template labels like "Finance Manager".
        /// </summary>
        public static string ToAuthorizationRole(string storedRole) =>
            storedRole switch
            {
                "Finance Manager" => Finance,
                "Maintenance Manager" => Maintenance,
                _ => storedRole
            };
    }
}
