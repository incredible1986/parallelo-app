using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Parallelo.Api.Models;

/// <summary>
/// Фиксация состояния дня по философии Лео Ауфмана (цветовой спектр) и присутствия.
/// </summary>
public class DailyState
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    // Цветовой спектр настроения (напр., "#F59E0B" - теплый оранжевый, "#3B82F6" - синий покой, "#10B981" - зелёная гармония)
    [Required]
    [MaxLength(20)]
    public string ColorHex { get; set; } = "#F59E0B";

    // Название состояния (напр., "Солнечный оранжевый (радость)", "Тихая синева (покой)", "Пепельный (усталость)")
    [MaxLength(100)]
    public string StateTitle { get; set; } = "Теплый покой";

    // Ответ на главный вопрос: "Что ты сегодня почувствовал?" (сенсорный опыт)
    [MaxLength(1000)]
    public string SensoryNote { get; set; } = string.Empty;

    // «Только в этот момент чувствую жизнь по-настоящему» — флаг проживания настоящего момента
    public bool FeltAliveToday { get; set; } = true;

    // Уровень присутствия / заземления (1-10)
    [Range(1, 10)]
    public int GroundingScore { get; set; } = 8;

    [JsonIgnore]
    public User? User { get; set; }
}
