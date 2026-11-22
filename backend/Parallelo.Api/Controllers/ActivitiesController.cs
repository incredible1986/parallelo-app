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
public class ActivitiesController : ControllerBase
{
    private readonly AppDbContext _db;
    
    public ActivitiesController(AppDbContext db)
    {
        _db = db;
    }
    
    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var activities = await _db.Activities
            .Where(a => a.UserId == GetUserId())
            .OrderByDescending(a => a.Date)
            .ToListAsync();
        
        return Ok(activities);
    }
    
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ActivityRequest request)
    {
        var activity = new Activity
        {
            UserId = GetUserId(),
            Type = request.Type,
            Description = request.Description ?? "",
            Enjoyment = request.Enjoyment,
            Date = DateTime.UtcNow
        };
        
        _db.Activities.Add(activity);
        await _db.SaveChangesAsync();
        
        return Ok(activity);
    }
}

public class ActivityRequest
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Enjoyment { get; set; }
}