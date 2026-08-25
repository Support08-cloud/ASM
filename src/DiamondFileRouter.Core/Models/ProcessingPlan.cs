namespace DiamondFileRouter.Core.Models;

public sealed class ProcessingPlan
{
    public required string InputPath { get; init; }
    public required IReadOnlyList<string> InputPaths { get; init; }
    public required string OutputPath { get; init; }
    public required IReadOnlyList<ProcessingPlanItem> Items { get; init; }
    public required DestinationIndex DestinationIndex { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public IReadOnlyList<ScanError> ScanErrors { get; init; } = Array.Empty<ScanError>();
    public PathValidationResult? Validation { get; init; }

    public int TotalFiles => Items.Count;
    public int MatchedCount => Items.Count(i => i.Status is ItemStatus.Matched or ItemStatus.AlreadyExists);
    public int UnmatchedCount => Items.Count(i => i.Status == ItemStatus.Unmatched);
    public int DuplicateCount => Items.Count(i => i.DestinationExistedAtAnalysis);
    public int ErrorCount => Items.Count(i => i.Status == ItemStatus.Error) + ScanErrors.Count;

    public IEnumerable<ProcessingPlanItem> ProcessableItems =>
        Items.Where(i => i.Status is ItemStatus.Matched or ItemStatus.AlreadyExists);
}
