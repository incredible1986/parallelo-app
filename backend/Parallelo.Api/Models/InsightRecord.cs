using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Parallelo.Api.Models;

/// <summary>
/// Вычисленные закономерности (Паттерны радости и покоя, а не вины).
/// </summary>
public class InsightRecord
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    // Категория: "Якорь силы", "Связь тела и сна", "Ритмы недели"
    [MaxLength(100)]
    public string Category { get; set; } = "Якорь силы";

    // Уровень достоверности закономерности (%)
    public int ConfidencePercent { get; set; } = 90;

    [JsonIgnore]
    public User? User { get; set; }
}
