namespace DiamondFileRouter.Core.Models;

public sealed class SessionResult
{
    public required SessionOutcome Outcome { get; init; }
    public required ProcessingPlan Plan { get; init; }
    public required ProcessingStatistics Statistics { get; init; }
    public required DateTimeOffset StartedAt { get; init; }
    public required DateTimeOffset FinishedAt { get; init; }
    public string? LogPath { get; init; }
    public string? CsvReportPath { get; init; }
    public string? JsonReportPath { get; init; }
    public string? TxtReportPath { get; init; }
    public string? PrimaryReportPath => CsvReportPath ?? JsonReportPath ?? TxtReportPath;
    public string? ErrorMessage { get; init; }
}
