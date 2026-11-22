using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Parallelo.Api.Models;

namespace Parallelo.Api.Services;

public class TokenService
{
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public TokenService(IConfiguration config, IWebHostEnvironment env)
    {
        _config = config;
        _env = env;
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name)
        };

        var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_SECRET");
        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            if (_env.IsDevelopment())
            {
                jwtKey = "parallelo_dev_only_key_change_in_production_64_chars_minimum_0001";
            }
            else
            {
                throw new InvalidOperationException("JWT signing key is not configured.");
            }
        }

        var issuer = _config["Jwt:Issuer"] ?? "Parallelo";
        var audience = _config["Jwt:Audience"] ?? "ParalleloClient";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(14),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
