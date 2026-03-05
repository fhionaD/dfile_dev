using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Maintenance,Super Admin")]
    public class EmployeesController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public EmployeesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Employees.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(e => e.TenantId == tenantId);
            }

            if (showArchived)
            {
                query = query.Where(e => e.Status == "Archived");
            }
            else
            {
                query = query.Where(e => e.Status != "Archived");
            }

            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Employee>> GetEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            return employee;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<ActionResult<Employee>> PostEmployee(CreateEmployeeDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var employee = new Employee
            {
                Id = $"EMP-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                FirstName = dto.FirstName,
                MiddleName = dto.MiddleName,
                LastName = dto.LastName,
                Email = dto.Email,
                ContactNumber = dto.ContactNumber,
                Department = dto.Department,
                Role = dto.Role,
                HireDate = dto.HireDate,
                Status = "Active",
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetEmployee", new { id = employee.Id }, employee);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> PutEmployee(string id, UpdateEmployeeDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Employees.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.FirstName = dto.FirstName;
            existing.MiddleName = dto.MiddleName;
            existing.LastName = dto.LastName;
            existing.Email = dto.Email;
            existing.ContactNumber = dto.ContactNumber;
            existing.Department = dto.Department;
            existing.Role = dto.Role;
            existing.HireDate = dto.HireDate;
            existing.Status = dto.Status;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> ArchiveEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            employee.Status = "Archived";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> RestoreEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            employee.Status = "Active";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> DeleteEmployee(string id)
        {
            var tenantId = GetCurrentTenantId();
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && employee.TenantId != tenantId) return NotFound();

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
