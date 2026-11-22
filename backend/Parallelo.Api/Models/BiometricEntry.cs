using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Parallelo.Api.Models;

/// <summary>
/// Пассивный слой биометрии (подготовлен под прямой фоновый импорт из Apple HealthKit).
/// </summary>
public class BiometricEntry
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    // Общий сон в часах (HKCategoryTypeIdentifierSleepAnalysis)
    public double SleepHours { get; set; }

    // Глубокий сон в часах (asleepDeep)
    public double DeepSleepHours { get; set; }

    // Шаги (HKQuantityTypeIdentifierStepCount)
    public int Steps { get; set; }

    // Пульс покоя (HKQuantityTypeIdentifierRestingHeartRate)
    public double? RestingHeartRate { get; set; }

    // Вариабельность сердечного ритма / стресс (HKQuantityTypeIdentifierHeartRateVariabilitySDNN)
    public double? HrvScore { get; set; }

    [JsonIgnore]
    public User? User { get; set; }
}
