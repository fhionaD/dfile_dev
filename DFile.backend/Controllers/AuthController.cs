using DFile.backend.Authorization;
using DFile.backend.Constants;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Helpers;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;

namespace DFile.backend.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailService _emailService;
        private readonly IMemoryCache _cache;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILoginAuditService _loginAudit;

        public AuthController(AppDbContext context, IConfiguration configuration, ILogger<AuthController> logger, IEmailService emailService, IMemoryCache cache, IHttpClientFactory httpClientFactory, ILoginAuditService loginAudit)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _emailService = emailService;
            _cache = cache;
            _httpClientFactory = httpClientFactory;
            _loginAudit = loginAudit;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto? dto)
        {
            try
            {
                if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                    return BadRequest(new { success = false, message = "Email and password are required." });

                var emailNormalized = dto.Email.Trim().ToLowerInvariant();
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = Request.Headers.UserAgent.ToString();

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

                if (user == null)
                {
                    _logger.LogWarning("Login failed: User not found for email: {Email}", emailNormalized);
                    // Record anonymous failed attempt without user
                    _context.UserLoginAudits.Add(new UserLoginAudit
                    {
                        Email = emailNormalized,
                        AttemptStatus = "LOGIN_FAILED",
                        IpAddress = ipAddress,
                        UserAgent = userAgent,
                        AttemptedAt = DateTime.UtcNow,
                        FailureReason = "User not found"
                    });
                    try { await _context.SaveChangesAsync(); }
                    catch (Exception ex) { _logger.LogError(ex, "Failed to save anonymous login audit for {Email}", emailNormalized); }
                    return Unauthorized(new { success = false, message = "Invalid credentials.", attemptsLeft = (int?)null, cooldownMinutes = 0 });
                }

                // Check lockout before anything else
                if (await _loginAudit.IsLockedOutAsync(user))
                {
                    var remainingSeconds = (int)(user.LockoutEnd!.Value - DateTime.UtcNow).TotalSeconds;
                    var remainingMinutes = (int)Math.Ceiling(remainingSeconds / 60.0);
                    return StatusCode(429, new
                    {
                        success = false,
                        message = "Too many failed login attempts. Your account is temporarily locked.",
                        attemptsLeft = 0,
                        cooldownMinutes = remainingMinutes,
                        cooldownSeconds = remainingSeconds
                    });
                }

                if (user.Status == "PendingActivation")
                    return Unauthorized(new { success = false, message = "Your account is pending activation. Please check your email for the activation link.", attemptsLeft = (int?)null, cooldownMinutes = 0 });

                if (string.IsNullOrWhiteSpace(user.PasswordHash))
                    return Unauthorized(new { success = false, message = "Invalid credentials.", attemptsLeft = (int?)null, cooldownMinutes = 0 });

                if (user.TenantId.HasValue)
                {
                    var tenant = await _context.Tenants.FindAsync(user.TenantId.Value);
                    if (tenant != null && tenant.Status != "Active")
                        return Unauthorized(new { success = false, message = "Your organization's account is inactive. Please contact support.", attemptsLeft = (int?)null, cooldownMinutes = 0 });
                }

                bool passwordMatches;
                try
                {
                    passwordMatches = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error verifying password for user {UserId}", user.Id);
                    passwordMatches = false;
                }

                if (!passwordMatches)
                {
                    _logger.LogWarning("Login failed: Invalid password for user {UserId}", user.Id);
                    LoginAttemptResult? result = null;
                    try
                    {
                        result = await _loginAudit.RecordFailedAttemptAsync(user, ipAddress, userAgent, "Invalid password");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to record login attempt for user {UserId}", user.Id);
                    }

                    if (result?.IsLocked == true)
                    {
                        return StatusCode(429, new
                        {
                            success = false,
                            message = "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.",
                            attemptsLeft = 0,
                            cooldownMinutes = result.CooldownMinutes,
                            cooldownSeconds = result.CooldownMinutes * 60,
                            securityAlertSent = result.SecurityAlertSent
                        });
                    }

                    return Unauthorized(new
                    {
                        success = false,
                        message = result?.IsSuspicious == true
                            ? "Invalid credentials. Suspicious activity detected — a security email has been sent to your account."
                            : "Invalid credentials.",
                        attemptsLeft = result?.AttemptsLeft ?? 0,
                        cooldownMinutes = 0,
                        securityAlertSent = result?.SecurityAlertSent ?? false,
                        isSuspicious = result?.IsSuspicious ?? false
                    });
                }

                // Login succeeded â€” reset failed attempts
                await _loginAudit.ResetFailedAttemptsAsync(user);

                // Device recognition
                var fingerprint = _loginAudit.GenerateDeviceFingerprint(userAgent, ipAddress);
                var isKnownDevice = await _loginAudit.IsKnownDeviceAsync(user.Id, fingerprint);
                bool emailNotificationSent = false;

                await _loginAudit.SaveTrustedDeviceAsync(user.Id, fingerprint, ipAddress, userAgent);
                await _loginAudit.RecordSuccessAsync(user, ipAddress, userAgent);

                if (!isKnownDevice)
                {
                    // Log new device audit event
                    _context.UserLoginAudits.Add(new UserLoginAudit
                    {
                        UserId = user.Id,
                        Email = user.Email,
                        AttemptStatus = "NEW_DEVICE_LOGIN",
                        IpAddress = ipAddress,
                        UserAgent = userAgent,
                        AttemptedAt = DateTime.UtcNow,
                        TenantId = user.TenantId
                    });
                    try { await _context.SaveChangesAsync(); }
                    catch (Exception ex) { _logger.LogError(ex, "Failed to save new-device audit for user {UserId}", user.Id); }

                    try
                    {
                        await _emailService.SendNewDeviceLoginAlertAsync(user.Email, user.FirstName, ipAddress, userAgent);
                        emailNotificationSent = true;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send new device alert for user {UserId}", user.Id);
                    }
                }
                else
                {
                    try
                    {
                        await _emailService.SendLoginSuccessNotificationAsync(user.Email, user.FirstName, ipAddress, userAgent, false);
                        emailNotificationSent = true;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send login notification for user {UserId}", user.Id);
                    }
                }

                _logger.LogInformation("Login successful for user {UserId}: {Email}", user.Id, user.Email);
                var token = GenerateJwtToken(user);
                var userResponse = await MapToResponseWithPermissions(user);

                return Ok(new
                {
                    success = true,
                    token,
                    user = userResponse,
                    newDeviceDetected = !isKnownDevice,
                    emailNotificationSent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login");
                return StatusCode(500, new { success = false, message = "Internal server error. Please try again later." });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            return Ok(await MapToResponseWithPermissions(user));
        }

        [HttpPost("register")]
        [Authorize(Roles = "Super Admin,Admin")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "User with this email already exists." });

            // Validate role
            var validRoles = new[] { "Admin", "Finance Manager", "Maintenance Manager", "Super Admin" };
            if (!validRoles.Contains(dto.Role))
                return BadRequest(new { message = "Invalid role. Must be one of: Admin, Finance Manager, Maintenance Manager, Super Admin" });

            var callerRole = User.GetJwtRole();
            var callerTenantClaim = User.FindFirst("TenantId")?.Value;
            int? callerTenantId = string.IsNullOrEmpty(callerTenantClaim) ? null : int.Parse(callerTenantClaim, CultureInfo.InvariantCulture);

            // Super Admin can create users for any tenant, Admin can only create for their own tenant
            int? newUserTenantId;
            if (callerRole == "Super Admin")
            {
                newUserTenantId = dto.TenantId;
            }
            else if (callerRole == "Admin")
            {
                // Admin can only create users for their own tenant
                newUserTenantId = callerTenantId;
            }
            else
            {
                return Forbid("Only Super Admin or Admin can create users");
            }

            // Create the user with all personal details
            var user = new User
            {
                FirstName = dto.FirstName,
                MiddleName = dto.MiddleName,
                LastName = dto.LastName,
                Email = dto.Email,
                ContactNumber = dto.ContactNumber,
                Address = dto.Address,
                Role = dto.Role,
                RoleLabel = dto.Role,
                TenantId = newUserTenantId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created successfully", userId = user.Id });
        }

        [HttpPost("setup-password")]
        [AllowAnonymous]
        public async Task<IActionResult> SetupPassword([FromBody] SetupPasswordDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid request." });

            var emailNormalized = dto.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

            if (user == null || user.Status != "PendingActivation")
                return BadRequest(new { message = "Invalid or already used activation link." });

            if (user.ActivationTokenExpiry == null || user.ActivationTokenExpiry < DateTime.UtcNow)
                return BadRequest(new { message = "Activation link has expired. Please ask your administrator to resend the invitation." });

            var tokenHash = ComputeTokenHash(dto.Token);
            if (tokenHash != user.ActivationTokenHash)
                return BadRequest(new { message = "Invalid or already used activation link." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.Status = "Active";
            user.ActivationTokenHash = null;
            user.ActivationTokenExpiry = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} completed account activation", user.Id);
            return Ok(new { message = "Password set successfully. You can now log in." });
        }

        private static string ComputeTokenHash(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        [HttpPost("google/token")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleTokenLogin([FromBody] GoogleTokenDto? dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Credential))
                return BadRequest(new { message = "Google credential is required." });

            var clientId = _configuration["Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                return StatusCode(503, new { message = "Google OAuth is not configured on this server." });

            string googleEmail;
            try
            {
                using var http = _httpClientFactory.CreateClient();
                var verifyResponse = await http.GetAsync(
                    $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(dto.Credential)}");

                if (!verifyResponse.IsSuccessStatusCode)
                    return Unauthorized(new { message = "Invalid Google credential." });

                var json = await verifyResponse.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("aud", out var audProp) || audProp.GetString() != clientId)
                    return Unauthorized(new { message = "Google credential was not issued for this application." });

                if (!root.TryGetProperty("email_verified", out var evProp) || evProp.GetString() != "true")
                    return Unauthorized(new { message = "Google account email is not verified." });

                if (!root.TryGetProperty("email", out var emailProp) || string.IsNullOrWhiteSpace(emailProp.GetString()))
                    return Unauthorized(new { message = "Could not retrieve email from Google account." });

                googleEmail = emailProp.GetString()!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google token verification failed");
                return Unauthorized(new { message = "Google sign-in failed. Please try again." });
            }

            var emailNormalized = googleEmail.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

            if (user == null)
                return Unauthorized(new { message = "No DFile account found for your Google email. Contact your administrator." });

            if (user.Status == "PendingActivation")
                return Unauthorized(new { message = "Your account is pending activation. Check your email." });

            if (user.TenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(user.TenantId.Value);
                if (tenant != null && tenant.Status != "Active")
                    return Unauthorized(new { message = "Your organization account is inactive. Contact support." });
            }

            var jwt = GenerateJwtToken(user);
            return Ok(new
            {
                token = jwt,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    role = user.Role,
                    tenantId = user.TenantId,
                    fullName = $"{user.FirstName} {user.LastName}".Trim()
                }
            });
        }

        [HttpGet("google")]
        [AllowAnonymous]
        public IActionResult InitiateGoogleOAuth()
        {
            var clientId = _configuration["Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                return StatusCode(503, new { message = "Google OAuth is not configured on this server." });

            var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                .Replace("+", "-").Replace("/", "_").TrimEnd('=');
            _cache.Set($"oauth_state:{state}", true, TimeSpan.FromMinutes(10));

            var backendBase = (_configuration["Google:BackendBaseUrl"] ?? $"{Request.Scheme}://{Request.Host}").TrimEnd('/');
            var redirectUri = $"{backendBase}/api/auth/google/callback";

            var url = "https://accounts.google.com/o/oauth2/v2/auth" +
                      $"?client_id={Uri.EscapeDataString(clientId)}" +
                      $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                      $"&response_type=code" +
                      $"&scope={Uri.EscapeDataString("openid email profile")}" +
                      $"&state={Uri.EscapeDataString(state)}" +
                      $"&access_type=offline" +
                      $"&prompt=select_account";

            return Redirect(url);
        }

        [HttpGet("google/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleOAuthCallback(
            [FromQuery] string? code,
            [FromQuery] string? state,
            [FromQuery] string? error)
        {
            // Payment:AppBaseUrl must be set via the Payment__AppBaseUrl environment variable.
            // Fall back to the current request origin so redirects remain functional even if the env var is missing.
            var rawAppBaseUrl = _configuration["Payment:AppBaseUrl"];
            var appBaseUrl = !string.IsNullOrWhiteSpace(rawAppBaseUrl)
                ? rawAppBaseUrl.TrimEnd('/')
                : $"{Request.Scheme}://{Request.Host}";

            if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
                return Redirect($"{appBaseUrl}/google-callback?error=google_auth_failed");

            var stateKey = $"oauth_state:{state}";
            if (!_cache.TryGetValue(stateKey, out _))
                return Redirect($"{appBaseUrl}/google-callback?error=invalid_state");
            _cache.Remove(stateKey);

            var clientId = _configuration["Google:ClientId"]!;
            var clientSecret = _configuration["Google:ClientSecret"]!;
            var backendBase = (_configuration["Google:BackendBaseUrl"] ?? $"{Request.Scheme}://{Request.Host}").TrimEnd('/');
            var redirectUri = $"{backendBase}/api/auth/google/callback";

            string googleEmail;
            try
            {
                using var http = _httpClientFactory.CreateClient();
                var tokenResponse = await http.PostAsync("https://oauth2.googleapis.com/token",
                    new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["code"] = code,
                        ["client_id"] = clientId,
                        ["client_secret"] = clientSecret,
                        ["redirect_uri"] = redirectUri,
                        ["grant_type"] = "authorization_code"
                    }));

                if (!tokenResponse.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Google token exchange failed with status {Status}", tokenResponse.StatusCode);
                    return Redirect($"{appBaseUrl}/google-callback?error=google_token_exchange_failed");
                }

                var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
                using var tokenDoc = System.Text.Json.JsonDocument.Parse(tokenJson);
                var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();
                if (string.IsNullOrEmpty(accessToken))
                    return Redirect($"{appBaseUrl}/google-callback?error=google_token_missing");

                http.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                var userInfoResponse = await http.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");

                if (!userInfoResponse.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Google userinfo request failed with status {Status}", userInfoResponse.StatusCode);
                    return Redirect($"{appBaseUrl}/google-callback?error=google_userinfo_failed");
                }

                var userInfoJson = await userInfoResponse.Content.ReadAsStringAsync();
                using var userInfoDoc = System.Text.Json.JsonDocument.Parse(userInfoJson);
                googleEmail = userInfoDoc.RootElement.GetProperty("email").GetString()
                    ?? throw new InvalidOperationException("No email in Google userinfo response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google OAuth flow failed");
                return Redirect($"{appBaseUrl}/google-callback?error=google_auth_error");
            }

            var emailNormalized = googleEmail.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

            if (user == null)
                return Redirect($"{appBaseUrl}/google-callback?error=no_account");

            if (user.Status == "PendingActivation")
                return Redirect($"{appBaseUrl}/google-callback?error=pending_activation");

            if (user.TenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(user.TenantId.Value);
                if (tenant != null && tenant.Status != "Active")
                    return Redirect($"{appBaseUrl}/google-callback?error=tenant_inactive");
            }

            var jwt = GenerateJwtToken(user);
            return Redirect($"{appBaseUrl}/google-callback#{Uri.EscapeDataString(jwt)}");
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException("JWT Key is not configured in appsettings.json");
            }

            var key = Encoding.ASCII.GetBytes(jwtKey);
            var userRole = string.IsNullOrWhiteSpace(user.Role) ? "Employee" : user.Role;
            var authRole = UserRoleConstants.ToAuthorizationRole(userRole);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString(CultureInfo.InvariantCulture)),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, authRole)
            };

            if (user.TenantId.HasValue)
            {
                claims.Add(new Claim("TenantId", user.TenantId.Value.ToString(CultureInfo.InvariantCulture)));
            }

            var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationMinutes"], out var mins) ? mins : 30;
            var issuer = _configuration["Jwt:Issuer"] ?? "DFile";
            var audience = _configuration["Jwt:Audience"] ?? "DFile";

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(expirationMinutes),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private static async Task<UserResponseDto> MapToResponseWithPermissions(User user)
        {
            var response = new UserResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                MiddleName = user.MiddleName,
                LastName = user.LastName,
                Email = user.Email,
                ContactNumber = user.ContactNumber,
                Address = user.Address,
                Role = user.Role,
                RoleLabel = user.RoleLabel,
                Status = user.Status,
                TenantId = user.TenantId
            };

            return await Task.FromResult(response);
        }
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { message = "Email is required." });

            // Always return the same response to prevent user enumeration
            const string safeResponse = "If that email is registered, a password reset link has been sent.";

            var emailNormalized = dto.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

            if (user == null || user.Status == "PendingActivation")
                return Ok(new { message = safeResponse });

            var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
            var tokenHash = ComputeTokenHash(rawToken);

            user.ActivationTokenHash = tokenHash;
            user.ActivationTokenExpiry = DateTime.UtcNow.AddHours(1);

            await _context.SaveChangesAsync();

            var rawForgotAppBaseUrl = _configuration["Payment:AppBaseUrl"];
            var appBaseUrl = !string.IsNullOrWhiteSpace(rawForgotAppBaseUrl)
                ? rawForgotAppBaseUrl.TrimEnd('/')
                : $"{Request.Scheme}://{Request.Host}";
            var encodedToken = Uri.EscapeDataString(rawToken);
            var encodedEmail = Uri.EscapeDataString(user.Email);
            var resetLink = $"{appBaseUrl}/reset-password?token={encodedToken}&email={encodedEmail}";

            var html = $"""
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0">
                  <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">Reset your DFile password</h2>
                  <p style="margin:0 0 24px;font-size:14px;color:#475569">
                    We received a request to reset the password for your account (<strong>{user.Email}</strong>).
                    Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
                  </p>
                  <a href="{resetLink}"
                     style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">
                    Reset Password
                  </a>
                  <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
                    If you didn&rsquo;t request this, you can safely ignore this email. Your password will not change.
                  </p>
                </div>
                """;

            try
            {
                await _emailService.SendEmailAsync(user.Email, "Reset Your DFile Password", html);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", user.Email);
                // Do not expose send failure to the caller
            }

            return Ok(new { message = safeResponse });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid request." });

            var emailNormalized = dto.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

            if (user == null || user.ActivationTokenHash == null || user.ActivationTokenExpiry == null)
                return BadRequest(new { message = "This reset link is invalid or has already been used." });

            if (user.ActivationTokenExpiry < DateTime.UtcNow)
                return BadRequest(new { message = "This reset link has expired. Please request a new one." });

            var tokenHash = ComputeTokenHash(dto.Token);
            if (tokenHash != user.ActivationTokenHash)
                return BadRequest(new { message = "This reset link is invalid or has already been used." });

            var (isValid, errorMessage) = PasswordHelper.Validate(dto.NewPassword);
            if (!isValid)
                return BadRequest(new { message = errorMessage });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.ActivationTokenHash = null;
            user.ActivationTokenExpiry = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset completed for user {UserId}", user.Id);
            return Ok(new { message = "Password has been successfully reset. Please log in." });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid request." });

            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            bool currentMatches;
            try
            {
                currentMatches = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
            }
            catch
            {
                currentMatches = false;
            }

            if (!currentMatches)
                return BadRequest(new { message = "Current password is incorrect." });

            var (isValid, errorMessage) = PasswordHelper.Validate(dto.NewPassword);
            if (!isValid)
                return BadRequest(new { message = errorMessage });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed for user {UserId}", user.Id);
            return Ok(new { message = "Password changed successfully." });
        }
    }
}


