using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DFile.backend.Controllers
{
    [ApiController]
    [Route("api/test")]
    [Authorize(Roles = "Super Admin")]
    public class TestController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public TestController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpGet("smtp")]
        public async Task<IActionResult> TestSmtp()
        {
            await _emailService.SendEmailAsync(
                "yourpersonalemail@gmail.com",
                "SMTP Test",
                "<h2>It works ✅</h2>"
            );

            return Ok("Email sent");
        }
    }
}