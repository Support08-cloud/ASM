namespace DiamondFileRouter.Core.Models;

public sealed class ProgressSnapshot
{
    public required ProcessingStatistics Statistics { get; init; }
    public ProcessingPlanItem? CurrentItem { get; init; }
    public required string Message { get; init; }
    public bool IsCompleted { get; init; }
    public bool IsCancelled { get; init; }
}
