using System.Globalization;
using System.Text;
using System.Text.Json;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Reporting;

public interface IReportGenerator
{
    ReportPaths Generate(ProcessingPlan plan, ProcessingStatistics stats, SessionOutcome outcome, string directory, ReportFormat formats, DateTimeOffset timestamp);
}

public sealed class ReportPaths
{
    public string? Csv { get; init; }
    public string? Json { get; init; }
    public string? Txt { get; init; }
    public string? Primary => Csv ?? Json ?? Txt;
}

public sealed class ReportGenerator : IReportGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    public ReportPaths Generate(
        ProcessingPlan plan,
        ProcessingStatistics stats,
        SessionOutcome outcome,
        string directory,
        ReportFormat formats,
        DateTimeOffset timestamp)
    {
        Directory.CreateDirectory(directory);
        var stamp = timestamp.ToLocalTime().ToString("yyyy-MM-dd_HHmmss", CultureInfo.InvariantCulture);
        var prefix = Path.Combine(directory, $"Diamond_File_Router_Report_{stamp}");

        string? csv = null, json = null, txt = null;
        if (formats.HasFlag(ReportFormat.Csv))
        {
            csv = prefix + ".csv";
            WriteCsv(csv, plan);
        }

        if (formats.HasFlag(ReportFormat.Json))
        {
            json = prefix + ".json";
            var payload = new
            {
                generatedAt = timestamp,
                outcome = outcome.ToString(),
                input = plan.InputPath,
                output = plan.OutputPath,
                statistics = stats,
                files = plan.Items.Select(i => new
                {
                    i.SourceFileName,
                    i.SourcePath,
                    i.StoneId,
                    i.DestinationFolder,
                    i.DestinationFilePath,
                    status = i.Status.ToString(),
                    matchMethod = i.MatchMethod.ToString(),
                    duplicate = i.DuplicateStatus.ToString(),
                    reason = i.Reason,
                    error = i.ErrorInformation
                })
            };
            File.WriteAllText(json, JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8);
        }

        if (formats.HasFlag(ReportFormat.Txt))
        {
            txt = prefix + ".txt";
            var sb = new StringBuilder();
            sb.AppendLine("Diamond File Router Report");
            sb.AppendLine(timestamp.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss"));
            sb.AppendLine($"Outcome: {outcome}");
            sb.AppendLine($"Input: {plan.InputPath}");
            sb.AppendLine($"Output: {plan.OutputPath}");
            sb.AppendLine($"Total: {stats.TotalFiles}  Copied: {stats.CopiedFiles}  Skipped: {stats.SkippedFiles}  Unmatched: {stats.UnmatchedFiles}  Errors: {stats.FailedFiles}");
            sb.AppendLine();
            foreach (var item in plan.Items)
            {
                sb.AppendLine($"{item.SourceFileName}\t{item.StoneId}\t{item.Status}\t{item.Reason}");
            }
            File.WriteAllText(txt, sb.ToString(), Encoding.UTF8);
        }

        return new ReportPaths { Csv = csv, Json = json, Txt = txt };
    }

    private static void WriteCsv(string path, ProcessingPlan plan)
    {
        var sb = new StringBuilder();
        sb.AppendLine("File Name,Stone ID,Destination,Status,Reason");
        foreach (var item in plan.Items)
        {
            sb.Append(Escape(item.SourceFileName)).Append(',');
            sb.Append(Escape(item.StoneId)).Append(',');
            sb.Append(Escape(item.DestinationFolder is null ? "" : Path.GetFileName(item.DestinationFolder))).Append(',');
            sb.Append(Escape(item.Status.ToString().ToUpperInvariant())).Append(',');
            sb.Append(Escape(item.Reason));
            sb.AppendLine();
        }
        File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
    }

    internal static string Escape(string? value)
    {
        var text = value ?? string.Empty;
        if (text.Contains('"') || text.Contains(',') || text.Contains('\n') || text.Contains('\r'))
            return "\"" + text.Replace("\"", "\"\"") + "\"";
        return text;
    }
}
