using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Parallelo.Api.Models;

public class Activity
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    public string Type { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    [Range(1, 10)]
    public int Enjoyment { get; set; }
    
    public DateTime Date { get; set; } = DateTime.UtcNow;
    
    [JsonIgnore]
    public User? User { get; set; }
}