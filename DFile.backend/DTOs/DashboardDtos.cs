namespace DFile.backend.DTOs
{
    public class DashboardSummaryDto
    {
        public int TotalActiveAssets { get; set; }
        public int UnallocatedAssets { get; set; }
        public int AssetsUnderMaintenance { get; set; }
        public int ReplacementCandidates { get; set; }
        public int PendingProcurementApprovals { get; set; }
        public int DisposedThisMonth { get; set; }
        public decimal TotalCurrentBookValue { get; set; }
        public int OverdueMaintenanceItems { get; set; }
    }
}
