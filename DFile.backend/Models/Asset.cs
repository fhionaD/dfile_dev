using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class Asset
    {
        public string Id { get; set; } = string.Empty;
        [Required]
        public string Desc { get; set; } = string.Empty;
        public string Cat { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string? Image { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Vendor { get; set; }
        public decimal Value { get; set; }
        public int UsefulLifeYears { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal CurrentBookValue { get; set; }
        public decimal MonthlyDepreciation { get; set; }
    }
}
