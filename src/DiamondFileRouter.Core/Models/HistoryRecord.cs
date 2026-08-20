namespace DiamondFileRouter.Core.Models;

public sealed class HistoryRecord
{
    public required string Id { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
    public required string InputPath { get; init; }
    public required string OutputPath { get; init; }
    public required int TotalFiles { get; init; }
    public required int Matched { get; init; }
    public required int Copied { get; init; }
    public required int Skipped { get; init; }
    public required int Unmatched { get; init; }
    public required int Errors { get; init; }
    public required TimeSpan Duration { get; init; }
    public required string Result { get; init; }
    public string? ReportPath { get; init; }
}
