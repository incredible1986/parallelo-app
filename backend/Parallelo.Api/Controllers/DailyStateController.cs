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
public class DailyStateController : ControllerBase
{
    private readonly AppDbContext _db;

    public DailyStateController(AppDbContext db)
    {
        _db = db;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent([FromQuery] int days = 14)
    {
        var since = DateTime.UtcNow.Date.AddDays(-days);
        var states = await _db.DailyStates
            .Where(s => s.UserId == GetUserId() && s.Date >= since)
            .OrderByDescending(s => s.Date)
            .ToListAsync();

        return Ok(states);
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = DateTime.UtcNow.Date;
        var state = await _db.DailyStates
            .Where(s => s.UserId == GetUserId() && s.Date >= today)
            .OrderByDescending(s => s.Date)
            .FirstOrDefaultAsync();

        if (state == null)
            return Ok(new { hasEntry = false });

        return Ok(new { hasEntry = true, state });
    }

    [HttpPost]
    public async Task<IActionResult> LogState([FromBody] DailyStateRequest request)
    {
        var state = new DailyState
        {
            UserId = GetUserId(),
            Date = DateTime.UtcNow,
            ColorHex = string.IsNullOrWhiteSpace(request.ColorHex) ? "#F59E0B" : request.ColorHex,
            StateTitle = string.IsNullOrWhiteSpace(request.StateTitle) ? "Тёплый покой" : request.StateTitle,
            SensoryNote = request.SensoryNote ?? string.Empty,
            FeltAliveToday = request.FeltAliveToday,
            GroundingScore = request.GroundingScore is >= 1 and <= 10 ? request.GroundingScore : 8
        };

        _db.DailyStates.Add(state);
        await _db.SaveChangesAsync();

        return Ok(state);
    }
}

public class DailyStateRequest
{
    public string ColorHex { get; set; } = "#F59E0B";
    public string StateTitle { get; set; } = "Тёплый покой";
    public string SensoryNote { get; set; } = string.Empty;
    public bool FeltAliveToday { get; set; } = true;
    public int GroundingScore { get; set; } = 8;
}
