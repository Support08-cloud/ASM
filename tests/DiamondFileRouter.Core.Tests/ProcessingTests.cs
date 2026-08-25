using DiamondFileRouter.Core.DuplicateHandling;
using DiamondFileRouter.Core.History;
using DiamondFileRouter.Core.Indexing;
using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Logging;
using DiamondFileRouter.Core.Matching;
using DiamondFileRouter.Core.Models;
using DiamondFileRouter.Core.Orchestration;
using DiamondFileRouter.Core.Processing;
using DiamondFileRouter.Core.Progress;
using DiamondFileRouter.Core.Reporting;
using DiamondFileRouter.Core.Scanning;
using DiamondFileRouter.Core.Settings;

namespace DiamondFileRouter.Core.Tests;

public class ProcessingTests
{
    private static RouterOrchestrator Create(IFileSystem fs, string dataDir)
    {
        var progress = new ProgressManager();
        return new RouterOrchestrator(
            fs,
            new PathSafetyValidator(fs),
            new FileScanner(fs),
            new OutputDirectoryIndexer(fs),
            new MatchEngine(new StoneIdResolver(), fs),
            new ProcessingEngine(fs, new DuplicateHandler(fs), new FileCopyService(fs), progress),
            new LoggingService(),
            new ReportGenerator(),
            new HistoryManager(Path.Combine(dataDir, "history.db")),
            dataDir);
    }

    [Fact]
    public async Task Copy_does_not_modify_source_and_does_not_create_unknown_folders()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        ws.CreateOutputStone("xyz");
        ws.CreateOutputStone("lmn");
        var src = ws.WriteInputFile("abc.html", "hello-abc");
        ws.WriteInputFile("xyz.html", "hello-xyz");
        ws.WriteInputFile("lmn.html", "hello-lmn");
        ws.WriteInputFile("unknown.html", "nope");

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        Assert.Equal(1, plan.UnmatchedCount);

        var result = await orchestrator.ProcessAsync(plan, new ProcessingOptions
        {
            TransferMode = TransferMode.Copy,
            DuplicateHandling = DuplicateAction.Skip,
            ReportDirectory = Path.Combine(ws.Data, "reports"),
            LoggingEnabled = true
        });

        Assert.Equal("hello-abc", File.ReadAllText(src));
        Assert.True(File.Exists(src));
        Assert.Equal("hello-abc", File.ReadAllText(Path.Combine(ws.Output, "abc", "abc.html")));
        Assert.False(Directory.Exists(Path.Combine(ws.Output, "unknown")));
        Assert.Equal(3, result.Statistics.CopiedFiles);
        Assert.Equal(1, result.Statistics.UnmatchedFiles);
        Assert.True(File.Exists(result.CsvReportPath));
        var csv = File.ReadAllText(result.CsvReportPath!);
        Assert.Contains("unknown.html", csv);
        Assert.Contains("UNMATCHED", csv);
    }

    [Fact]
    public async Task Duplicate_skip_does_not_overwrite()
    {
        using var ws = new TempWorkspace();
        var destDir = ws.CreateOutputStone("abc");
        File.WriteAllText(Path.Combine(destDir, "abc.html"), "original");
        ws.WriteInputFile("abc.html", "new");

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        Assert.True(plan.Items[0].DestinationExistedAtAnalysis);

        var result = await orchestrator.ProcessAsync(plan, new ProcessingOptions { DuplicateHandling = DuplicateAction.Skip, ReportDirectory = ws.Data });
        Assert.Equal("original", File.ReadAllText(Path.Combine(destDir, "abc.html")));
        Assert.Equal(1, result.Statistics.SkippedFiles);
        Assert.Equal(ItemStatus.Skipped, plan.Items[0].Status);
    }

    [Fact]
    public async Task Duplicate_replace_overwrites_only_when_allowed()
    {
        using var ws = new TempWorkspace();
        var destDir = ws.CreateOutputStone("abc");
        File.WriteAllText(Path.Combine(destDir, "abc.html"), "original");
        ws.WriteInputFile("abc.html", "new");

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        await Assert.ThrowsAsync<InvalidOperationException>(() => orchestrator.ProcessAsync(plan, new ProcessingOptions
        {
            DuplicateHandling = DuplicateAction.Replace,
            AllowReplace = false,
            ReportDirectory = ws.Data
        }));

        var plan2 = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        var result = await orchestrator.ProcessAsync(plan2, new ProcessingOptions
        {
            DuplicateHandling = DuplicateAction.Replace,
            AllowReplace = true,
            ReportDirectory = ws.Data
        });
        Assert.Equal("new", File.ReadAllText(Path.Combine(destDir, "abc.html")));
        Assert.Equal(1, result.Statistics.CopiedFiles);
    }

    [Fact]
    public async Task Duplicate_rename_creates_unique_filename()
    {
        using var ws = new TempWorkspace();
        var destDir = ws.CreateOutputStone("abc");
        File.WriteAllText(Path.Combine(destDir, "abc.html"), "original");
        ws.WriteInputFile("abc.html", "new");

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        await orchestrator.ProcessAsync(plan, new ProcessingOptions
        {
            DuplicateHandling = DuplicateAction.Rename,
            ReportDirectory = ws.Data
        });

        Assert.Equal("original", File.ReadAllText(Path.Combine(destDir, "abc.html")));
        Assert.Equal("new", File.ReadAllText(Path.Combine(destDir, "abc (1).html")));
    }

    [Fact]
    public async Task Large_file_is_copied_via_streams()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("clip");
        ws.WriteInputBinary("clip.mp4", 2 * 1024 * 1024);

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        var result = await orchestrator.ProcessAsync(plan, new ProcessingOptions { ReportDirectory = ws.Data });
        var dest = Path.Combine(ws.Output, "clip", "clip.mp4");
        Assert.True(File.Exists(dest));
        Assert.Equal(2 * 1024 * 1024, new FileInfo(dest).Length);
        Assert.Equal(2 * 1024 * 1024, result.Statistics.BytesCopied);
        Assert.Empty(Directory.GetFiles(ws.Output, "*.dfr.tmp", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task Cancellation_stops_remaining_work_and_cleans_temp_files()
    {
        using var ws = new TempWorkspace();
        for (var i = 0; i < 40; i++)
        {
            var id = $"s{i:00}";
            ws.CreateOutputStone(id);
            ws.WriteInputBinary(id + ".bin", 32 * 1024);
        }

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        using var cts = new CancellationTokenSource();
        orchestrator.ItemUpdated += (_, e) =>
        {
            if (e.Item.Status == ItemStatus.Completed)
                cts.Cancel();
        };

        var result = await orchestrator.ProcessAsync(plan, new ProcessingOptions { ReportDirectory = ws.Data }, cts.Token);
        Assert.Equal(SessionOutcome.Cancelled, result.Outcome);
        Assert.True(result.Statistics.CopiedFiles < 40);
        Assert.True(result.Statistics.CancelledFiles > 0);
        Assert.Empty(Directory.GetFiles(ws.Root, "*.dfr.tmp", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task Access_denied_is_isolated_and_batch_continues()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        ws.CreateOutputStone("xyz");
        ws.CreateOutputStone("lmn");
        ws.WriteInputFile("abc.html", "a");
        ws.WriteInputFile("xyz.html", "x");
        var denied = ws.WriteInputFile("lmn.html", "l");

        var fs = new FaultingFileSystem();
        fs.AccessDenied.Add(denied);
        var orchestrator = Create(fs, ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        var result = await orchestrator.ProcessAsync(plan, new ProcessingOptions { ReportDirectory = ws.Data });

        Assert.True(File.Exists(Path.Combine(ws.Output, "abc", "abc.html")));
        Assert.True(File.Exists(Path.Combine(ws.Output, "xyz", "xyz.html")));
        Assert.Equal(1, result.Statistics.FailedFiles);
        Assert.Contains(plan.Items, i => i.SourceFileName == "lmn.html" && i.Status == ItemStatus.Error && i.ErrorInformation == "Access denied");
    }

    [Fact]
    public async Task File_disappearing_during_processing_is_reported()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        var file = ws.WriteInputFile("abc.html");
        var fs = new FaultingFileSystem();
        fs.DisappearOnRead.Add(file);
        var orchestrator = Create(fs, ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        var result = await orchestrator.ProcessAsync(plan, new ProcessingOptions { ReportDirectory = ws.Data });
        Assert.Equal(1, result.Statistics.FailedFiles);
        Assert.Equal("Source file disappeared", plan.Items[0].ErrorInformation);
    }

    [Fact]
    public async Task Complete_folder_copy_preserves_structure()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E-2500600-15-30");
        ws.WriteInputFile(Path.Combine("E-2500600-15-30", "0.json"), "0");
        ws.WriteInputFile(Path.Combine("E-2500600-15-30", "inner", "sm.json"), "sm");

        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        var plan = await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        await orchestrator.ProcessAsync(plan, new ProcessingOptions { ReportDirectory = ws.Data });
        Assert.Equal("0", File.ReadAllText(Path.Combine(ws.Output, "E-2500600-15-30", "0.json")));
        Assert.Equal("sm", File.ReadAllText(Path.Combine(ws.Output, "E-2500600-15-30", "inner", "sm.json")));
    }

    [Fact]
    public async Task Analyze_does_not_copy_files()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        ws.WriteInputFile("abc.html");
        var orchestrator = Create(new PhysicalFileSystem(), ws.Data);
        await orchestrator.AnalyzeAsync(new[] { ws.Input }, ws.Output, true);
        Assert.False(File.Exists(Path.Combine(ws.Output, "abc", "abc.html")));
    }
}

public class SafetyAndStorageTests
{
    [Fact]
    public void Same_input_and_output_is_rejected()
    {
        using var ws = new TempWorkspace();
        var validator = new PathSafetyValidator(new PhysicalFileSystem());
        var result = validator.Validate(new[] { ws.Output }, ws.Output);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("same directory", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Input_nested_inside_output_is_rejected()
    {
        using var ws = new TempWorkspace();
        var nested = Path.Combine(ws.Output, "nested-input");
        Directory.CreateDirectory(nested);
        var validator = new PathSafetyValidator(new PhysicalFileSystem());
        var result = validator.Validate(new[] { nested }, ws.Output);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("nested inside Output", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Output_nested_inside_input_is_rejected()
    {
        using var ws = new TempWorkspace();
        var nestedOut = Path.Combine(ws.Input, "nested-output");
        Directory.CreateDirectory(nestedOut);
        var validator = new PathSafetyValidator(new PhysicalFileSystem());
        var result = validator.Validate(new[] { ws.Input }, nestedOut);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("nested inside Input", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Invalid_directories_are_rejected()
    {
        var validator = new PathSafetyValidator(new PhysicalFileSystem());
        var result = validator.Validate(new[] { Path.Combine(Path.GetTempPath(), "missing-" + Guid.NewGuid()) }, Path.Combine(Path.GetTempPath(), "missing-out-" + Guid.NewGuid()));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("does not exist", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Settings_round_trip()
    {
        var path = Path.Combine(Path.GetTempPath(), "dfr-settings-" + Guid.NewGuid(), "settings.json");
        var manager = new SettingsManager(path);
        manager.Save(new AppSettings
        {
            DefaultInputDirectory = @"D:\In",
            TransferMode = TransferMode.Move,
            DuplicateHandling = DuplicateAction.Rename,
            RecursiveScanning = false
        });
        var loaded = manager.Load();
        Assert.Equal(@"D:\In", loaded.DefaultInputDirectory);
        Assert.Equal(TransferMode.Move, loaded.TransferMode);
        Assert.Equal(DuplicateAction.Rename, loaded.DuplicateHandling);
        Assert.False(loaded.RecursiveScanning);
    }

    [Fact]
    public void History_persists_across_instances()
    {
        var db = Path.Combine(Path.GetTempPath(), "dfr-history-" + Guid.NewGuid(), "history.db");
        var first = new HistoryManager(db);
        first.Add(new HistoryRecord
        {
            Id = "abc",
            Timestamp = DateTimeOffset.Now,
            InputPath = "in",
            OutputPath = "out",
            TotalFiles = 4,
            Matched = 3,
            Copied = 3,
            Skipped = 0,
            Unmatched = 1,
            Errors = 0,
            Duration = TimeSpan.FromSeconds(2),
            Result = "Completed",
            ReportPath = "report.csv"
        });

        var second = new HistoryManager(db);
        var row = Assert.Single(second.List());
        Assert.Equal("abc", row.Id);
        Assert.Equal(4, row.TotalFiles);
        Assert.Equal("report.csv", row.ReportPath);
    }

    [Fact]
    public void Csv_escapes_commas_and_quotes()
    {
        Assert.Equal("\"a,b\"", ReportGenerator.Escape("a,b"));
        Assert.Equal("\"a\"\"b\"", ReportGenerator.Escape("a\"b"));
    }
}
