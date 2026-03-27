using System.ComponentModel.DataAnnotations;
using DFile.backend.Models;

namespace DFile.backend.DTOs
{
    public class CreateAssetCategoryDto
    {
        [Required(ErrorMessage = "CategoryName is required.")]
        public string CategoryName { get; set; } = string.Empty;

        [Required(ErrorMessage = "HandlingType is required.")]
        public HandlingType HandlingType { get; set; } = HandlingType.Fixed;

        public string Description { get; set; } = string.Empty;
    }

    public class UpdateAssetCategoryDto
    {
        [Required(ErrorMessage = "CategoryName is required.")]
        public string CategoryName { get; set; } = string.Empty;

        [Required(ErrorMessage = "HandlingType is required.")]
        public HandlingType HandlingType { get; set; } = HandlingType.Fixed;

        public string Description { get; set; } = string.Empty;

        public byte[]? RowVersion { get; set; }
    }

    public class AssetCategoryResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AssetCategoryCode { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public HandlingType HandlingType { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool IsArchived { get; set; }
        public int? TenantId { get; set; }
        public int AssetCount { get; set; }
        public string? CreatedByName { get; set; }
        public string? UpdatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public byte[]? RowVersion { get; set; }
        public string DisplayName => $"{CategoryName} - {HandlingType}";
    }
}
