namespace DFile.backend.DTOs
{
    public class PlanDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyCost { get; set; }
        public decimal YearlyCost { get; set; }
        public int MaxRooms { get; set; }
        public int MaxPersonnel { get; set; }
        public bool CanCreateFinanceManager { get; set; }
        public bool CanCreateMaintenanceManager { get; set; }
        public bool AssetTracking { get; set; }
        public bool Depreciation { get; set; }
        public bool MaintenanceModule { get; set; }
        public bool ReportsModule { get; set; }
        public bool ProcurementModule { get; set; }
        public bool IsActive { get; set; }
        public bool IsArchived { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreatePlanDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyCost { get; set; }
        public decimal YearlyCost { get; set; }
        public int MaxRooms { get; set; }
        public int MaxPersonnel { get; set; }
        public bool CanCreateFinanceManager { get; set; }
        public bool CanCreateMaintenanceManager { get; set; }
        public bool AssetTracking { get; set; } = true;
        public bool Depreciation { get; set; } = true;
        public bool MaintenanceModule { get; set; }
        public bool ReportsModule { get; set; }
        public bool ProcurementModule { get; set; }
    }

    public class UpdatePlanDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyCost { get; set; }
        public decimal YearlyCost { get; set; }
        public int MaxRooms { get; set; }
        public int MaxPersonnel { get; set; }
        public bool CanCreateFinanceManager { get; set; }
        public bool CanCreateMaintenanceManager { get; set; }
        public bool AssetTracking { get; set; }
        public bool Depreciation { get; set; }
        public bool MaintenanceModule { get; set; }
        public bool ReportsModule { get; set; }
        public bool ProcurementModule { get; set; }
        public bool IsActive { get; set; }
    }
}
