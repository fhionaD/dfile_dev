using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateRoomDto
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Floor { get; set; } = string.Empty;
        public string? CategoryId { get; set; }
    }

    public class UpdateRoomDto
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Floor { get; set; } = string.Empty;
        public string? CategoryId { get; set; }
        public byte[]? RowVersion { get; set; }
    }

    public class RoomResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;
        public string? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? SubCategoryName { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public string? ArchivedBy { get; set; }
        public int? TenantId { get; set; }
        public string? CreatedByName { get; set; }
        public string? UpdatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public byte[]? RowVersion { get; set; }
    }

    public class CreateRoomCategoryDto
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SubCategory { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Description { get; set; } = string.Empty;
    }

    public class UpdateRoomCategoryDto
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SubCategory { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Description { get; set; } = string.Empty;
        public byte[]? RowVersion { get; set; }
    }

    public class RoomCategoryResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string RoomCategoryCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string SubCategory { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public string? ArchivedBy { get; set; }
        public int? TenantId { get; set; }
        public int RoomCount { get; set; }
        public string? CreatedByName { get; set; }
        public string? UpdatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public byte[]? RowVersion { get; set; }
    }
}
