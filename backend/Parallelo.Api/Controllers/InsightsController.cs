using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parallelo.Api.Data;
using System.Security.Claims;

namespace Parallelo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InsightsController : ControllerBase
{
    private readonly AppDbContext _db;

    public InsightsController(AppDbContext db)
    {
        _db = db;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet]
    public async Task<IActionResult> GetInsights()
    {
        var userId = GetUserId();
        var states = await _db.DailyStates
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.Date)
            .Take(30)
            .ToListAsync();

        var rituals = await _db.Rituals
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.LoggedAt)
            .Take(30)
            .ToListAsync();

        var generated = new List<object>();

        // Если есть ритуалы
        if (rituals.Any())
        {
            var topAnchor = rituals
                .GroupBy(r => r.Title)
                .OrderByDescending(g => g.Count())
                .First();

            generated.Add(new
            {
                Title = $"Твой главный якорь: {topAnchor.Key}",
                Message = $"Ты обращалась к ритуалу «{topAnchor.Key}» уже {topAnchor.Count()} раз. Это твоя проверенная гавань присутствия.",
                Category = "Якорь силы",
                Icon = "sparkles"
            });
        }

        // Если есть дни присутствия
        var aliveCount = states.Count(s => s.FeltAliveToday);
        if (states.Any())
        {
            var alivePercent = (int)Math.Round((double)aliveCount / states.Count * 100);
            generated.Add(new
            {
                Title = "Дни настоящего присутствия",
                Message = $"В {alivePercent}% дней ты чувствовала жизнь по-настоящему. Каждая такая точка — семя в твоём саду жизни.",
                Category = "Осознанность",
                Icon = "heart"
            });
        }

        if (!generated.Any())
        {
            generated.Add(new
            {
                Title = "Сад только засаживается",
                Message = "Зафиксируй цвет сегодняшнего дня или добавь первый ритуал заземления. Данные проявят твои скрытые паттерны радости.",
                Category = "Начало",
                Icon = "sun"
            });
        }

        return Ok(generated);
    }
}
