namespace DFile.backend.Authorization
{
    /// <summary>
    /// Marks a controller action with a required module permission.
    /// The PermissionAuthorizationFilter checks this at runtime.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
    public class RequirePermissionAttribute : Attribute
    {
        public string ModuleName { get; }
        public string Action { get; }

        /// <param name="moduleName">The module key (e.g. "Assets", "Departments")</param>
        /// <param name="action">The permission action (e.g. "CanView", "CanCreate", "CanEdit", "CanApprove", "CanArchive")</param>
        public RequirePermissionAttribute(string moduleName, string action)
        {
            ModuleName = moduleName;
            Action = action;
        }
    }
}
