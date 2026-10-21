using System.Text;
using Vision360.BulkExtractor.Matching;
using Vision360.BulkExtractor.Text;

namespace Vision360.BulkExtractor.Copying;

public enum ConflictPolicy
{
    SkipExisting,
    Overwrite,
}

public sealed record PlannedMatch(string Id, string SourcePath, string DestinationPath, MatchKind Kind);

public sealed record CopyProgress(
    string? CurrentId,
    int TotalIds,
    int CompletedIds,
    int FailedIds,
    int MissingIds,
    long FilesCopied,
    long FilesSkipped,
    long BytesCopied,
    string Message);

public sealed record CopySummary
{
    public int TotalIds { get; init; }

    public int SucceededIds { get; init; }

    public int MissingIds { get; init; }

    public int FailedIds { get; init; }

    public int UnfinishedIds { get; init; }

    public long FilesCopied { get; init; }

    public long FilesSkipped { get; init; }

    public long BytesCopied { get; init; }

    public TimeSpan Elapsed { get; init; }

    public bool WasCancelled { get; init; }

    public bool NoMatches { get; init; }

    public IReadOnlyList<string> MissingIdList { get; init; } = [];

    public IReadOnlyList<string> FailedIdList { get; init; } = [];

    public string LogText { get; init; } = "";

    public string? LogFilePath { get; init; }

    public string FormatReport()
    {
        var report = new StringBuilder();
        report.AppendLine("Vision360 Bulk Data Extractor");
        report.AppendLine($"Total IDs imported: {TotalIds}");
        report.AppendLine($"IDs successfully processed: {SucceededIds}");
        report.AppendLine($"IDs not found: {MissingIds}");
        report.AppendLine($"IDs that failed: {FailedIds}");
        if (WasCancelled)
        {
            report.AppendLine($"IDs not finished: {UnfinishedIds}");
        }

        report.AppendLine($"Files copied: {FilesCopied}");
        report.AppendLine($"Files skipped because they already existed: {FilesSkipped}");
        report.AppendLine($"Total data copied: {ByteText.Format(BytesCopied)}");
        report.AppendLine($"Processing time: {ByteText.FormatDuration(Elapsed)}");
        if (WasCancelled)
        {
            report.AppendLine("Status: Cancelled. Files already copied were left in the destination.");
        }
        else if (NoMatches)
        {
            report.AppendLine("Status: No matching files or folders were found. Nothing was copied.");
        }
        else if (FailedIds > 0)
        {
            report.AppendLine("Status: Finished with errors.");
        }
        else
        {
            report.AppendLine("Status: Finished.");
        }

        AppendList(report, "Missing IDs:", MissingIdList);
        AppendList(report, "Failed IDs:", FailedIdList);
        return report.ToString();
    }

    private static void AppendList(StringBuilder report, string title, IReadOnlyList<string> ids)
    {
        if (ids.Count == 0)
        {
            return;
        }

        report.AppendLine();
        report.AppendLine(title);
        foreach (var id in ids)
        {
            report.AppendLine(id);
        }
    }
}
