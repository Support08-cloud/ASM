namespace DiamondFileRouter.Core.Models;

public sealed class AppSettings
{
    public string? DefaultInputDirectory { get; set; }
    public string? DefaultOutputDirectory { get; set; }
    public TransferMode TransferMode { get; set; } = TransferMode.Copy;
    public DuplicateAction DuplicateHandling { get; set; } = DuplicateAction.Skip;
    public bool RecursiveScanning { get; set; } = true;
    public bool PreviewBeforeProcessing { get; set; } = true;
    public bool ConfirmationBeforeReplacement { get; set; } = true;
    public bool LoggingEnabled { get; set; } = true;
    public string? ReportLocation { get; set; }
    public ReportFormat ReportFormats { get; set; } = ReportFormat.All;
    public int CopyBufferSizeBytes { get; set; } = 1024 * 1024;

    public AppSettings Clone() => new()
    {
        DefaultInputDirectory = DefaultInputDirectory,
        DefaultOutputDirectory = DefaultOutputDirectory,
        TransferMode = TransferMode,
        DuplicateHandling = DuplicateHandling,
        RecursiveScanning = RecursiveScanning,
        PreviewBeforeProcessing = PreviewBeforeProcessing,
        ConfirmationBeforeReplacement = ConfirmationBeforeReplacement,
        LoggingEnabled = LoggingEnabled,
        ReportLocation = ReportLocation,
        ReportFormats = ReportFormats,
        CopyBufferSizeBytes = CopyBufferSizeBytes
    };
}
