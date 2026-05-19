namespace DFile.backend.Constants;

public class ModuleDefinition
{
    public ModuleDefinition(string @namespace, string name, string description)
    {
        Namespace = @namespace;
        Name = name;
        Description = description;
    }

    public string Namespace { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
}

public static class ModuleRegistry
{
    public const string AdminNamespace = "Admin";
    public const string FinanceNamespace = "Finance";
    public const string MaintenanceNamespace = "Maintenance";

    public static List<ModuleDefinition> GetAllModules() => new()
    {
        // Admin Namespace (12 modules)
        new(AdminNamespace, "Dashboard", "Tenant overview and key metrics"),
        new(AdminNamespace, "OrganizationStructure", "Manage organizational hierarchy and structure"),
        new(AdminNamespace, "Departments", "Manage departments and divisions"),
        new(AdminNamespace, "Users", "Manage user accounts and access"),
        new(AdminNamespace, "Roles", "Manage role templates and permissions"),
        new(AdminNamespace, "Billing", "Manage billing and payment information"),
        new(AdminNamespace, "AuditLogs", "View system audit logs and activity"),
        new(AdminNamespace, "Registration&Tagging", "Register and tag assets"),
        new(AdminNamespace, "Allocation", "Allocate assets to employees and locations"),
        new(AdminNamespace, "Disposals", "Manage asset disposals and retirements"),
        new(AdminNamespace, "Locations", "Manage asset locations and warehouses"),
        new(AdminNamespace, "Maintenance", "Manage maintenance records and schedules"),

        // Finance Namespace (7 modules)
        new(FinanceNamespace, "Dashboard", "Finance overview and key metrics"),
        new(FinanceNamespace, "Assets", "Track and manage asset financial data"),
        new(FinanceNamespace, "Disposals", "Manage financial aspects of asset disposals"),
        new(FinanceNamespace, "Reports", "Generate financial reports and analytics"),
        new(FinanceNamespace, "Depreciation", "Track asset depreciation and calculations"),
        new(FinanceNamespace, "MaintenanceRequests", "Review maintenance cost requests"),
        new(FinanceNamespace, "MaintenanceOverview", "View maintenance costs overview"),

        // Maintenance Namespace (4 modules)
        new(MaintenanceNamespace, "Dashboard", "Maintenance overview and metrics"),
        new(MaintenanceNamespace, "Schedules", "Manage maintenance schedules"),
        new(MaintenanceNamespace, "PartsReady", "Track ready parts inventory"),
        new(MaintenanceNamespace, "RepairHistory", "View asset repair history"),
    };

    public static List<ModuleDefinition> GetModulesByNamespace(string @namespace)
    {
        return GetAllModules().Where(m => m.Namespace == @namespace).ToList();
    }

    public static List<string> GetNamespaces()
    {
        return GetAllModules().Select(m => m.Namespace).Distinct().ToList();
    }

    public static bool ModuleExists(string moduleName)
    {
        if (string.IsNullOrWhiteSpace(moduleName))
            return false;

        return GetAllModules().Any(m =>
            m.Name.Equals(moduleName, StringComparison.OrdinalIgnoreCase));
    }
}
