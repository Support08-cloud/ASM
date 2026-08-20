using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Processing;

public sealed class ProcessingOptions
{
    public TransferMode TransferMode { get; init; } = TransferMode.Copy;
    public DuplicateAction DuplicateHandling { get; init; } = DuplicateAction.Skip;
    public bool AllowReplace { get; init; }
    public int CopyBufferSizeBytes { get; init; } = 1024 * 1024;
    public bool LoggingEnabled { get; init; } = true;
    public string? ReportDirectory { get; init; }
    public ReportFormat ReportFormats { get; init; } = ReportFormat.All;
}

public sealed class ItemUpdatedEventArgs : EventArgs
{
    public required ProcessingPlanItem Item { get; init; }
}
