namespace DiamondFileRouter.Core.Models;

public sealed class ProcessingStatistics
{
    public int TotalFiles { get; set; }
    public int ProcessedFiles { get; set; }
    public int MatchedFiles { get; set; }
    public int CopiedFiles { get; set; }
    public int SkippedFiles { get; set; }
    public int AlreadyExistingFiles { get; set; }
    public int UnmatchedFiles { get; set; }
    public int FailedFiles { get; set; }
    public int CancelledFiles { get; set; }
    public int MovedFiles { get; set; }
    public long BytesCopied { get; set; }
    public TimeSpan Duration { get; set; }

    public double PercentComplete =>
        TotalFiles == 0 ? 0 : Math.Min(100, ProcessedFiles * 100.0 / TotalFiles);

    public ProcessingStatistics Clone() => (ProcessingStatistics)MemberwiseClone();
}
