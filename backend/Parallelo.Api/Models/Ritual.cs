using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Parallelo.Api.Models;

/// <summary>
/// Ритуал / Якорь заземления (не сухая задача, а образ жизни и восстановления).
/// </summary>
public class Ritual
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    // Название ритуала (Баня, Прогулка в тишине, Чтение у окна, Стрижка травы, Чай)
    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    // Категория: "Тело и пар", "Природа и тишина", "Творчество", "Дом и забота"
    [MaxLength(100)]
    public string Category { get; set; } = "Тело и пар";

    // Иконка или символ ритуала
    [MaxLength(50)]
    public string Icon { get; set; } = "sparkles";

    // Является ли это ключевым якорем присутствия
    public bool IsAnchor { get; set; } = true;

    // Дата и время выполнения
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;

    // Длительность в минутах
    public int DurationMinutes { get; set; } = 60;

    // Ощущения после ритуала
    [MaxLength(500)]
    public string Reflection { get; set; } = string.Empty;

    [JsonIgnore]
    public User? User { get; set; }
}
