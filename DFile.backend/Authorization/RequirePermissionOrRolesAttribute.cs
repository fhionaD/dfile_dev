namespace DFile.backend.Authorization
{
    /// <summary>
    /// Requires module permission <em>or</em> membership in one of the given JWT roles (e.g. Finance can approve
    /// maintenance finance actions when RBAC template omits Assets.CanApprove).
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
    public sealed class RequirePermissionOrRolesAttribute : Attribute
    {
        public string ModuleName { get; }
        public string Action { get; }
        public string[] AlternateRoles { get; }

        public RequirePermissionOrRolesAttribute(string moduleName, string action, params string[] alternateRoles)
        {
            ModuleName = moduleName;
            Action = action;
            AlternateRoles = alternateRoles ?? Array.Empty<string>();
        }
    }
}
