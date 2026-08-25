using System.Text;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Logging;

public interface ILoggingService
{
    string? StartSession(string dataDirectory, string input, string output);
    void WriteLine(string? logPath, string message);
    void WriteItem(string? logPath, ProcessingPlanItem item);
    void WriteSummary(string? logPath, ProcessingStatistics stats, SessionOutcome outcome);
}

public sealed class LoggingService : ILoggingService
{
    public string? StartSession(string dataDirectory, string input, string output)
    {
        Directory.CreateDirectory(dataDirectory);
        var stamp = DateTime.Now.ToString("yyyy-MM-dd_HHmmss");
        var path = Path.Combine(dataDirectory, $"Diamond_File_Router_Log_{stamp}.txt");
        var builder = new StringBuilder();
        builder.AppendLine("Diamond File Router");
        builder.AppendLine("Vision 360 · Internal use only · Offline");
        builder.AppendLine(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
        builder.AppendLine();
        builder.AppendLine($"Input: {input}");
        builder.AppendLine($"Output: {output}");
        builder.AppendLine();
        File.WriteAllText(path, builder.ToString(), Encoding.UTF8);
        return path;
    }

    public void WriteLine(string? logPath, string message)
    {
        if (string.IsNullOrWhiteSpace(logPath))
            return;
        File.AppendAllText(logPath, message.TrimEnd() + Environment.NewLine, Encoding.UTF8);
    }

    public void WriteItem(string? logPath, ProcessingPlanItem item)
    {
        if (string.IsNullOrWhiteSpace(logPath))
            return;

        var builder = new StringBuilder();
        builder.AppendLine(item.SourceFileName);
        builder.AppendLine(item.Status.ToString().ToUpperInvariant());
        if (!string.IsNullOrWhiteSpace(item.StoneId))
            builder.AppendLine($"Stone ID: {item.StoneId}");
        if (!string.IsNullOrWhiteSpace(item.DestinationFolder))
            builder.AppendLine($"Copied to:{Environment.NewLine}{item.DestinationFolder}");
        if (!string.IsNullOrWhiteSpace(item.Reason))
            builder.AppendLine($"Reason:{Environment.NewLine}{item.Reason}");
        builder.AppendLine();
        File.AppendAllText(logPath, builder.ToString(), Encoding.UTF8);
    }

    public void WriteSummary(string? logPath, ProcessingStatistics stats, SessionOutcome outcome)
    {
        if (string.IsNullOrWhiteSpace(logPath))
            return;

        var builder = new StringBuilder();
        builder.AppendLine("----- SUMMARY -----");
        builder.AppendLine($"Outcome: {outcome}");
        builder.AppendLine($"Total: {stats.TotalFiles}");
        builder.AppendLine($"Processed: {stats.ProcessedFiles}");
        builder.AppendLine($"Matched: {stats.MatchedFiles}");
        builder.AppendLine($"Copied: {stats.CopiedFiles}");
        builder.AppendLine($"Skipped: {stats.SkippedFiles}");
        builder.AppendLine($"Already existing: {stats.AlreadyExistingFiles}");
        builder.AppendLine($"Unmatched: {stats.UnmatchedFiles}");
        builder.AppendLine($"Errors: {stats.FailedFiles}");
        builder.AppendLine($"Duration: {stats.Duration}");
        File.AppendAllText(logPath, builder.ToString(), Encoding.UTF8);
    }
}
