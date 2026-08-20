namespace DiamondFileRouter.Core.Models;

public sealed class ProcessingPlanItem
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string SourcePath { get; init; }
    public required string SourceFileName { get; init; }
    public required string SourceExtension { get; init; }
    public required string ParentFolder { get; init; }
    public string? StoneId { get; set; }
    public string? DestinationFolder { get; set; }
    public string? DestinationFilePath { get; set; }
    public MatchMethod MatchMethod { get; set; }
    public ItemStatus Status { get; set; } = ItemStatus.Pending;
    public DuplicateStatus DuplicateStatus { get; set; } = DuplicateStatus.None;
    public string? ErrorInformation { get; set; }
    public string? Reason { get; set; }
    public long FileSizeBytes { get; init; }
    public string? RelativePathWithinStone { get; set; }
    public bool DestinationExistedAtAnalysis { get; set; }

    public ProcessingPlanItem Clone() => (ProcessingPlanItem)MemberwiseClone();
}
