using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DFile.Backend.Tests;

public class JwtTokenTests
{
    private const string TestKey = "ThisIsADevOnlySecretKeyForDFileBackendApplication123!";
    private const string TestIssuer = "DFile";
    private const string TestAudience = "DFile";

    private static IConfiguration BuildConfig(int expirationMinutes = 30)
    {
        var inMemory = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = TestKey,
            ["Jwt:Issuer"] = TestIssuer,
            ["Jwt:Audience"] = TestAudience,
            ["Jwt:ExpirationMinutes"] = expirationMinutes.ToString(),
        };
        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemory)
            .Build();
    }

    private static string GenerateToken(IConfiguration config, string userId, string email, string role)
    {
        var key = config["Jwt:Key"]!;
        var issuer = config["Jwt:Issuer"];
        var audience = config["Jwt:Audience"];
        var expiry = int.TryParse(config["Jwt:ExpirationMinutes"], out var m) ? m : 30;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiry),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials,
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }

    [Fact]
    public void GeneratedToken_ContainsCorrectRoleClaim()
    {
        var config = BuildConfig();
        var jwt = GenerateToken(config, "user-1", "admin@dfile.local", "Admin");

        var handler = new JwtSecurityTokenHandler();
        var parsed = handler.ReadJwtToken(jwt);
        // JwtSecurityTokenHandler stores ClaimTypes.Role as the short-form "role" in the JWT payload
        var roleClaim = parsed.Claims.FirstOrDefault(c =>
            c.Type == ClaimTypes.Role ||
            c.Type == "role" ||
            c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;

        Assert.Equal("Admin", roleClaim);
    }

    [Fact]
    public void GeneratedToken_ExpiresIn30Minutes()
    {
        var config = BuildConfig(expirationMinutes: 30);
        var before = DateTime.UtcNow;
        var jwt = GenerateToken(config, "user-1", "admin@dfile.local", "Admin");
        var after = DateTime.UtcNow;

        var handler = new JwtSecurityTokenHandler();
        var parsed = handler.ReadJwtToken(jwt);

        Assert.True(parsed.ValidTo >= before.AddMinutes(29).AddSeconds(55));
        Assert.True(parsed.ValidTo <= after.AddMinutes(30).AddSeconds(5));
    }

    [Fact]
    public void GeneratedToken_HasCorrectIssuerAndAudience()
    {
        var config = BuildConfig();
        var jwt = GenerateToken(config, "user-1", "admin@dfile.local", "Admin");

        var handler = new JwtSecurityTokenHandler();
        var parsed = handler.ReadJwtToken(jwt);

        Assert.Equal(TestIssuer, parsed.Issuer);
        Assert.Contains(TestAudience, parsed.Audiences);
    }

    [Fact]
    public void GeneratedToken_ValidatesSuccessfully_WithMatchingKey()
    {
        var config = BuildConfig();
        var jwt = GenerateToken(config, "user-1", "admin@dfile.local", "Super Admin");

        var handler = new JwtSecurityTokenHandler();
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey)),
            ValidateIssuer = true,
            ValidIssuer = TestIssuer,
            ValidateAudience = true,
            ValidAudience = TestAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };

        var principal = handler.ValidateToken(jwt, validationParams, out _);
        Assert.True(principal.IsInRole("Super Admin"));
    }

    [Fact]
    public void GeneratedToken_FailsValidation_WithWrongKey()
    {
        var config = BuildConfig();
        var jwt = GenerateToken(config, "user-1", "admin@dfile.local", "Admin");

        var handler = new JwtSecurityTokenHandler();
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("WrongKeyThatIsLongEnoughToNotThrowA256bitError!!!")),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = false,
        };

        Assert.Throws<SecurityTokenSignatureKeyNotFoundException>(
            () => handler.ValidateToken(jwt, validationParams, out _));
    }
}

public class PasswordHashingTests
{
    [Fact]
    public void BCrypt_HashAndVerify_MatchCorrectPassword()
    {
        const string password = "MySecureP@ssw0rd!";
        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        Assert.True(BCrypt.Net.BCrypt.Verify(password, hash));
    }

    [Fact]
    public void BCrypt_Verify_ReturnsFalse_ForWrongPassword()
    {
        const string password = "CorrectPassword123!";
        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        Assert.False(BCrypt.Net.BCrypt.Verify("WrongPassword", hash));
    }

    [Fact]
    public void BCrypt_TwoHashes_OfSamePassword_AreNotEqual()
    {
        const string password = "SamePassword99!";
        var hash1 = BCrypt.Net.BCrypt.HashPassword(password);
        var hash2 = BCrypt.Net.BCrypt.HashPassword(password);

        Assert.NotEqual(hash1, hash2);
    }
}

