using DiamondFileRouter.Core.DuplicateHandling;
using DiamondFileRouter.Core.History;
using DiamondFileRouter.Core.Indexing;
using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Logging;
using DiamondFileRouter.Core.Matching;
using DiamondFileRouter.Core.Models;
using DiamondFileRouter.Core.Processing;
using DiamondFileRouter.Core.Progress;
using DiamondFileRouter.Core.Reporting;
using DiamondFileRouter.Core.Scanning;
using DiamondFileRouter.Core.Settings;

namespace DiamondFileRouter.Core.Orchestration;

public sealed class AnalyzeCompletedEventArgs : EventArgs
{
    public required ProcessingPlan Plan { get; init; }
}

public sealed class SessionCompletedEventArgs : EventArgs
{
    public required SessionResult Result { get; init; }
}

public interface IRouterOrchestrator
{
    event EventHandler<ProgressSnapshot>? ProgressChanged;
    event EventHandler<ItemUpdatedEventArgs>? ItemUpdated;
    event EventHandler<AnalyzeCompletedEventArgs>? AnalyzeCompleted;
    event EventHandler<SessionCompletedEventArgs>? SessionCompleted;
    event EventHandler<string>? StatusMessage;

    PathValidationResult Validate(IReadOnlyList<string> inputPaths, string? outputPath);
    Task<ProcessingPlan> AnalyzeAsync(IReadOnlyList<string> inputPaths, string outputPath, bool recursive, CancellationToken cancellationToken = default);
    Task<SessionResult> ProcessAsync(ProcessingPlan plan, ProcessingOptions options, CancellationToken cancellationToken = default);
}

public sealed class RouterOrchestrator : IRouterOrchestrator
{
    private readonly IFileSystem _fileSystem;
    private readonly PathSafetyValidator _validator;
    private readonly IFileScanner _scanner;
    private readonly IOutputDirectoryIndexer _indexer;
    private readonly IMatchEngine _matchEngine;
    private readonly IProcessingEngine _processingEngine;
    private readonly ILoggingService _logging;
    private readonly IReportGenerator _reports;
    private readonly IHistoryManager _history;
    private readonly string _dataDirectory;

    public RouterOrchestrator(
        IFileSystem fileSystem,
        PathSafetyValidator validator,
        IFileScanner scanner,
        IOutputDirectoryIndexer indexer,
        IMatchEngine matchEngine,
        IProcessingEngine processingEngine,
        ILoggingService logging,
        IReportGenerator reports,
        IHistoryManager history,
        string? dataDirectory = null)
    {
        _fileSystem = fileSystem;
        _validator = validator;
        _scanner = scanner;
        _indexer = indexer;
        _matchEngine = matchEngine;
        _processingEngine = processingEngine;
        _logging = logging;
        _reports = reports;
        _history = history;
        _dataDirectory = dataDirectory ?? DefaultDataDirectory;

        _processingEngine.ProgressChanged += (_, e) => ProgressChanged?.Invoke(this, e);
        _processingEngine.ItemUpdated += (_, e) => ItemUpdated?.Invoke(this, e);
    }

    public static RouterOrchestrator CreateDefault(string dataDirectory)
    {
        Directory.CreateDirectory(dataDirectory);
        var fs = new PhysicalFileSystem();
        var progress = new ProgressManager();
        var duplicates = new DuplicateHandler(fs);
        var copy = new FileCopyService(fs);
        var engine = new ProcessingEngine(fs, duplicates, copy, progress);
        return new RouterOrchestrator(
            fs,
            new PathSafetyValidator(fs),
            new FileScanner(fs),
            new OutputDirectoryIndexer(fs),
            new MatchEngine(new StoneIdResolver(), fs),
            engine,
            new LoggingService(),
            new ReportGenerator(),
            new HistoryManager(Path.Combine(dataDirectory, "history.db")),
            dataDirectory);
    }

    public static string DefaultDataDirectory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Vision360", "DiamondFileRouter");

    public event EventHandler<ProgressSnapshot>? ProgressChanged;
    public event EventHandler<ItemUpdatedEventArgs>? ItemUpdated;
    public event EventHandler<AnalyzeCompletedEventArgs>? AnalyzeCompleted;
    public event EventHandler<SessionCompletedEventArgs>? SessionCompleted;
    public event EventHandler<string>? StatusMessage;

    public PathValidationResult Validate(IReadOnlyList<string> inputPaths, string? outputPath) =>
        _validator.Validate(inputPaths, outputPath);

    public Task<ProcessingPlan> AnalyzeAsync(
        IReadOnlyList<string> inputPaths,
        string outputPath,
        bool recursive,
        CancellationToken cancellationToken = default)
    {
        return Task.Run(() =>
        {
            StatusMessage?.Invoke(this, "Validating paths…");
            var validation = _validator.Validate(inputPaths, outputPath);
            if (!validation.IsValid)
                throw new InvalidOperationException(string.Join(Environment.NewLine, validation.Errors));

            var inputs = validation.NormalizedInputPaths;
            var output = validation.NormalizedOutputPath!;

            StatusMessage?.Invoke(this, "Indexing Output folders…");
            var index = _indexer.Build(output, cancellationToken);

            StatusMessage?.Invoke(this, "Scanning Input…");
            var scan = _scanner.Scan(inputs, recursive, cancellationToken);

            StatusMessage?.Invoke(this, "Matching Stone IDs…");
            var plan = _matchEngine.BuildPlan(inputs, output, scan, index, validation);
            AnalyzeCompleted?.Invoke(this, new AnalyzeCompletedEventArgs { Plan = plan });
            StatusMessage?.Invoke(this, $"Preview ready · {plan.TotalFiles} file(s) · {plan.MatchedCount} matched · {plan.UnmatchedCount} unmatched.");
            return plan;
        }, cancellationToken);
    }

    public async Task<SessionResult> ProcessAsync(
        ProcessingPlan plan,
        ProcessingOptions options,
        CancellationToken cancellationToken = default)
    {
        var started = DateTimeOffset.Now;
        string? logPath = null;
        if (options.LoggingEnabled)
        {
            var logDir = Path.Combine(_dataDirectory, "Logs");
            logPath = _logging.StartSession(logDir, plan.InputPath, plan.OutputPath);
        }

        void OnItem(object? _, ItemUpdatedEventArgs e)
        {
            if (options.LoggingEnabled)
                _logging.WriteItem(logPath, e.Item);
        }

        _processingEngine.ItemUpdated += OnItem;
        ProcessingStatistics stats;
        try
        {
            stats = await _processingEngine.ProcessAsync(plan, options, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _processingEngine.ItemUpdated -= OnItem;
        }

        var finished = DateTimeOffset.Now;
        var outcome = cancellationToken.IsCancellationRequested
            ? SessionOutcome.Cancelled
            : stats.FailedFiles > 0
                ? SessionOutcome.CompletedWithErrors
                : SessionOutcome.Completed;

        if (options.LoggingEnabled)
            _logging.WriteSummary(logPath, stats, outcome);

        var reportDir = string.IsNullOrWhiteSpace(options.ReportDirectory)
            ? Path.Combine(DefaultDataDirectory, "Reports")
            : options.ReportDirectory!;
        var reports = _reports.Generate(plan, stats, outcome, reportDir, options.ReportFormats, finished);

        _history.Add(new HistoryRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            Timestamp = started,
            InputPath = plan.InputPath,
            OutputPath = plan.OutputPath,
            TotalFiles = stats.TotalFiles,
            Matched = stats.MatchedFiles,
            Copied = stats.CopiedFiles,
            Skipped = stats.SkippedFiles,
            Unmatched = stats.UnmatchedFiles,
            Errors = stats.FailedFiles,
            Duration = stats.Duration,
            Result = outcome.ToString(),
            ReportPath = reports.Primary
        });

        var result = new SessionResult
        {
            Outcome = outcome,
            Plan = plan,
            Statistics = stats,
            StartedAt = started,
            FinishedAt = finished,
            LogPath = logPath,
            CsvReportPath = reports.Csv,
            JsonReportPath = reports.Json,
            TxtReportPath = reports.Txt
        };
        SessionCompleted?.Invoke(this, new SessionCompletedEventArgs { Result = result });
        return result;
    }
}

public static class AppComposition
{
    public static ISettingsManager CreateSettings(string? dataDirectory = null)
    {
        var dir = dataDirectory ?? RouterOrchestrator.DefaultDataDirectory;
        Directory.CreateDirectory(dir);
        return new SettingsManager(Path.Combine(dir, "settings.json"));
    }
}
