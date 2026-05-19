using DFile.backend.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DFile.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Super Admin")]
public class ModulesController : ControllerBase
{
    [HttpGet]
    public ActionResult<object> GetAllModules()
    {
        var modules = ModuleRegistry.GetAllModules();
        var namespaces = ModuleRegistry.GetNamespaces();
        var groupedByNamespace = namespaces.Select(ns => new
        {
            Namespace = ns,
            Modules = ModuleRegistry.GetModulesByNamespace(ns).Select(m => new
            {
                m.Name,
                m.Description
            }).ToList()
        }).ToList();

        return Ok(new
        {
            Namespaces = namespaces,
            Modules = groupedByNamespace,
            Total = modules.Count
        });
    }

    [HttpGet("by-namespace/{namespace}")]
    public ActionResult<object> GetModulesByNamespace(string @namespace)
    {
        var modules = ModuleRegistry.GetModulesByNamespace(@namespace);

        if (modules.Count == 0)
            return NotFound(new { Message = "Namespace not found" });

        return Ok(new
        {
            Namespace = @namespace,
            Modules = modules.Select(m => new
            {
                m.Name,
                m.Description
            }).ToList(),
            Total = modules.Count
        });
    }

    [HttpGet("exists/{moduleName}")]
    public ActionResult<object> CheckModuleExists(string moduleName)
    {
        var exists = ModuleRegistry.ModuleExists(moduleName);
        return Ok(new { ModuleName = moduleName, Exists = exists });
    }
}
