using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parallelo.Api.Data;
using Parallelo.Api.Models;
using System.Security.Claims;

namespace Parallelo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RitualsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RitualsController(AppDbContext db)
    {
        _db = db;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rituals = await _db.Rituals
            .Where(r => r.UserId == GetUserId())
            .OrderByDescending(r => r.LoggedAt)
            .ToListAsync();

        return Ok(rituals);
    }

    [HttpGet("anchors")]
    public async Task<IActionResult> GetAnchors()
    {
        var anchors = await _db.Rituals
            .Where(r => r.UserId == GetUserId() && r.IsAnchor)
            .GroupBy(r => r.Title)
            .Select(g => new
            {
                Title = g.Key,
                Category = g.First().Category,
                Icon = g.First().Icon,
                Count = g.Count(),
                LastLogged = g.Max(r => r.LoggedAt)
            })
            .ToListAsync();

        return Ok(anchors);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RitualRequest request)
    {
        var ritual = new Ritual
        {
            UserId = GetUserId(),
            Title = request.Title,
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Тело и пар" : request.Category,
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "sparkles" : request.Icon,
            IsAnchor = request.IsAnchor,
            DurationMinutes = request.DurationMinutes <= 0 ? 45 : request.DurationMinutes,
            Reflection = request.Reflection ?? string.Empty,
            LoggedAt = DateTime.UtcNow
        };

        _db.Rituals.Add(ritual);
        await _db.SaveChangesAsync();

        return Ok(ritual);
    }
}

public class RitualRequest
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Тело и пар";
    public string Icon { get; set; } = "sparkles";
    public bool IsAnchor { get; set; } = true;
    public int DurationMinutes { get; set; } = 45;
    public string Reflection { get; set; } = string.Empty;
}
