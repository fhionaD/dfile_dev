using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DFile.backend.Controllers
{
    /// <summary>
    /// Fail-closed: rejects any non-SuperAdmin request that lacks a TenantId claim
    /// before the action method executes, preventing tenant filter bypass.
    /// </summary>
    public class RequireTenantFilter : IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            if (context.Controller is TenantAwareController ctrl)
            {
                if (!ctrl.IsSuperAdmin() && !ctrl.GetCurrentTenantId().HasValue)
                {
                    context.Result = new ForbidResult();
                }
            }
        }

        public void OnActionExecuted(ActionExecutedContext context) { }
    }

    [ServiceFilter(typeof(RequireTenantFilter))]
    public abstract class TenantAwareController : ControllerBase
    {
        [NonAction]
        public int? GetCurrentTenantId()
        {
            var tenantClaim = User.FindFirst("TenantId")?.Value;
            return string.IsNullOrEmpty(tenantClaim) ? null : int.Parse(tenantClaim);
        }

        [NonAction]
        public bool IsSuperAdmin()
        {
            return User.IsInRole("Super Admin");
        }
    }
}
