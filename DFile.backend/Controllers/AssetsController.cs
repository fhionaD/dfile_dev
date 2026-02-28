using DFile.backend.Core.Application.Services;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Linq;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class AssetsController : ControllerBase
    {
        private readonly IAssetService _assetService;

        public AssetsController(IAssetService assetService)
        {
            _assetService = assetService;
        }

        private int? GetTenantIdFromClaims()
        {
            var tenantIdStr = User.FindFirst("TenantId")?.Value;
            if (!string.IsNullOrEmpty(tenantIdStr) && int.TryParse(tenantIdStr, out int tenantId))
                return tenantId;
            return null;
        }

        private string? GetUserRole()
        {
            var role = User.FindFirst("role")?.Value;
            if (string.IsNullOrEmpty(role)) role = User.Claims.FirstOrDefault(c => c.Type.ToLower().Contains("role"))?.Value;
            return role;
        }

        private (bool ok, string? roleFound) AccessCheck(params string[] allowedRoles)
        {
            var role = GetUserRole();
            if (role == null) return (false, null);
            return (allowedRoles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)), role);
        }

        private IActionResult ForbiddenResponse(string action, string? roleFound)
        {
            return StatusCode(403, new 
            { 
                error = "Forbidden", 
                message = $"Role '{roleFound}' is not authorized for {action}.",
                roleFound = roleFound,
                userId = User.FindFirst("sub")?.Value
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAssets([FromQuery] bool? showArchived = null)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Procurement", "Employee");
            if (!check.ok) return ForbiddenResponse("View Assets", check.roleFound);
            
            var tenantId = GetTenantIdFromClaims();
            var assets = await _assetService.GetAssetsAsync(tenantId, showArchived);
            return Ok(assets);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAsset(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Procurement", "Employee");
            if (!check.ok) return ForbiddenResponse("View Asset", check.roleFound);

            var asset = await _assetService.GetAssetByIdAsync(id);
            if (asset == null) return NotFound();
            return Ok(asset);
        }

        [HttpPost]
        public async Task<IActionResult> PostAsset(Asset asset)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Procurement");
            if (!check.ok) return ForbiddenResponse("Create Asset", check.roleFound);

            var createdAsset = await _assetService.CreateAssetAsync(asset);
            return CreatedAtAction(nameof(GetAsset), new { id = createdAsset.Id }, createdAsset);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutAsset(string id, Asset asset)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Procurement");
            if (!check.ok) return ForbiddenResponse("Edit Asset", check.roleFound);
            await _assetService.UpdateAssetAsync(asset);
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveAsset(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Archive Asset", check.roleFound);
            await _assetService.ArchiveAssetAsync(id);
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreAsset(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Restore Asset", check.roleFound);
            await _assetService.RestoreAssetAsync(id);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAsset(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin");
            if (!check.ok) return ForbiddenResponse("Delete Asset", check.roleFound);
            await _assetService.DeleteAssetAsync(id);
            return NoContent();
        }
    }
}
