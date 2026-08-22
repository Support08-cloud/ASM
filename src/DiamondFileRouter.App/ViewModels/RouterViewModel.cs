using System.Collections.ObjectModel;
using System.IO;
using System.ComponentModel;
using System.Windows;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DiamondFileRouter.App.Services;
using DiamondFileRouter.Core.Models;
using DiamondFileRouter.Core.Orchestration;
using DiamondFileRouter.Core.Processing;

namespace DiamondFileRouter.App.ViewModels;

public partial class RouterViewModel : ObservableObject
{
    private readonly AppServices _services;
    private readonly AppSettings _settings;
    private CancellationTokenSource? _cts;
    private ProcessingPlan? _plan;
    private SessionResult? _lastResult;

    public RouterViewModel(AppServices services)
    {
        _services = services;
        _settings = services.Settings.Load();
        InputPath = _settings.DefaultInputDirectory ?? string.Empty;
        OutputPath = _settings.DefaultOutputDirectory ?? string.Empty;
        Recursive = _settings.RecursiveScanning;
        TransferMode = _settings.TransferMode;
        DuplicateHandling = _settings.DuplicateHandling;
        if (!string.IsNullOrWhiteSpace(InputPath))
            InputPaths = new[] { InputPath };

        ItemsView = CollectionViewSource.GetDefaultView(Items);
        ItemsView.Filter = FilterItem;

        _services.Orchestrator.ProgressChanged += (_, e) => Dispatch(() => ApplyProgress(e));
        _services.Orchestrator.StatusMessage += (_, message) => Dispatch(() => StatusMessage = message);
        _services.Orchestrator.ItemUpdated += (_, e) => Dispatch(() => ItemsView.Refresh());

        if (!string.IsNullOrWhiteSpace(OutputPath) && !Directory.Exists(OutputPath))
            ShowBanner("warn", $"Saved Output directory is not available: {OutputPath}");
        else if (!string.IsNullOrWhiteSpace(InputPath) && !Directory.Exists(InputPath) && !File.Exists(InputPath))
            ShowBanner("warn", $"Saved Input path is not available: {InputPath}");
    }

    public ObservableCollection<ProcessingPlanItem> Items { get; } = new();
    public ICollectionView ItemsView { get; }

    public IReadOnlyList<TransferMode> TransferModes { get; } = Enum.GetValues<TransferMode>();
    public IReadOnlyList<DuplicateAction> DuplicateActions { get; } = Enum.GetValues<DuplicateAction>();

    [ObservableProperty] private string _inputPath = string.Empty;
    [ObservableProperty] private string _outputPath = string.Empty;
    [ObservableProperty] private bool _recursive = true;
    [ObservableProperty] private TransferMode _transferMode = TransferMode.Copy;
    [ObservableProperty] private DuplicateAction _duplicateHandling = DuplicateAction.Skip;
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private bool _isProcessing;
    [ObservableProperty] private bool _hasPlan;
    [ObservableProperty] private string _statusMessage = "Select Input and Output, then Analyze. Nothing is copied until you start processing.";
    [ObservableProperty] private string _banner = string.Empty;
    [ObservableProperty] private string _bannerKind = "info";
    [ObservableProperty] private string _filter = "All";
    [ObservableProperty] private double _progressPercent;
    [ObservableProperty] private string _progressText = "Waiting";
    [ObservableProperty] private int _totalFiles;
    [ObservableProperty] private int _matchedFiles;
    [ObservableProperty] private int _unmatchedFiles;
    [ObservableProperty] private int _copiedFiles;
    [ObservableProperty] private int _skippedFiles;
    [ObservableProperty] private int _errorFiles;
    [ObservableProperty] private int _indexedFolders;
    [ObservableProperty] private string? _reportPath;
    [ObservableProperty] private string _inputSummary = "Drop files or a folder, or browse.";

    public IReadOnlyList<string> InputPaths { get; private set; } = Array.Empty<string>();
    public IReadOnlyList<string> Filters { get; } = new[] { "All", "Matched", "Unmatched", "Duplicates", "Skipped", "Errors" };
    public bool CanProcess => HasPlan && !IsBusy;

    partial void OnFilterChanged(string value) => ItemsView.Refresh();
    partial void OnHasPlanChanged(bool value) => OnPropertyChanged(nameof(CanProcess));
    partial void OnIsBusyChanged(bool value) => OnPropertyChanged(nameof(CanProcess));
    partial void OnTransferModeChanged(TransferMode value) => PersistPaths();
    partial void OnDuplicateHandlingChanged(DuplicateAction value) => PersistPaths();
    partial void OnRecursiveChanged(bool value) => PersistPaths();

    [RelayCommand]
    private void BrowseInputFolder()
    {
        var folder = _services.Dialogs.PickFolder("Select Input folder", ExistingDirectory(InputPath));
        if (folder is null)
            return;
        SetInput(new[] { folder }, folder);
    }

    [RelayCommand]
    private void BrowseInputFiles()
    {
        var files = _services.Dialogs.PickFiles("Select Input files", ExistingDirectory(InputPath));
        if (files is null || files.Count == 0)
            return;
        SetInput(files, files.Count == 1 ? files[0] : Path.GetDirectoryName(files[0]) ?? files[0]);
    }

    [RelayCommand]
    private void BrowseOutput()
    {
        var folder = _services.Dialogs.PickFolder("Select Output directory", ExistingDirectory(OutputPath));
        if (folder is null)
            return;
        OutputPath = folder;
        PersistPaths();
    }

    public void AcceptDrop(IReadOnlyList<string> paths)
    {
        if (paths.Count == 0)
            return;
        SetInput(paths, paths.Count == 1 ? paths[0] : Path.GetDirectoryName(paths[0]) ?? paths[0]);
    }

    [RelayCommand]
    private async Task AnalyzeAsync()
    {
        Banner = string.Empty;
        var inputs = ResolveInputs();
        if (inputs.Count == 0 || string.IsNullOrWhiteSpace(OutputPath))
        {
            ShowBanner("warn", "Choose an Input location and an existing Output directory before analyzing.");
            return;
        }

        var validation = _services.Orchestrator.Validate(inputs, OutputPath);
        if (!validation.IsValid)
        {
            ShowBanner("error", string.Join(Environment.NewLine, validation.Errors));
            return;
        }

        CancelToken();
        _cts = new CancellationTokenSource();
        IsBusy = true;
        HasPlan = false;
        Items.Clear();
        ReportPath = null;
        try
        {
            _plan = await _services.Orchestrator.AnalyzeAsync(inputs, OutputPath, Recursive, _cts.Token);
            foreach (var item in _plan.Items)
                Items.Add(item);
            HasPlan = true;
            IndexedFolders = _plan.DestinationIndex.Count;
            TotalFiles = _plan.TotalFiles;
            MatchedFiles = _plan.MatchedCount;
            UnmatchedFiles = _plan.UnmatchedCount;
            CopiedFiles = 0;
            SkippedFiles = _plan.DuplicateCount;
            ErrorFiles = _plan.ErrorCount;
            ProgressPercent = 0;
            ProgressText = "Preview ready — no files have been copied.";
            ShowBanner("ok", $"Indexed {IndexedFolders} Output folder(s). {MatchedFiles} matched, {UnmatchedFiles} unmatched. Review the plan, then start processing.");
            PersistPaths();
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Analysis cancelled.";
        }
        catch (Exception ex)
        {
            ShowBanner("error", ex.Message);
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private async Task ProcessAsync()
    {
        if (_plan is null)
        {
            ShowBanner("warn", "Analyze first. Processing never starts automatically.");
            return;
        }

        var settings = _services.Settings.Load();
        if (TransferMode == TransferMode.Move &&
            !_services.Dialogs.Confirm("Move mode", "Move permanently removes each Input file after a successful copy. Continue?"))
            return;

        if (DuplicateHandling == DuplicateAction.Replace && settings.ConfirmationBeforeReplacement &&
            !_services.Dialogs.Confirm("Replace existing files", "Replace mode overwrites files that already exist in Output. Continue?"))
            return;

        CancelToken();
        _cts = new CancellationTokenSource();
        IsBusy = true;
        IsProcessing = true;
        try
        {
            _lastResult = await _services.Orchestrator.ProcessAsync(_plan, new ProcessingOptions
            {
                TransferMode = TransferMode,
                DuplicateHandling = DuplicateHandling,
                AllowReplace = true,
                CopyBufferSizeBytes = Math.Max(32 * 1024, settings.CopyBufferSizeBytes),
                LoggingEnabled = settings.LoggingEnabled,
                ReportDirectory = string.IsNullOrWhiteSpace(settings.ReportLocation)
                    ? Path.Combine(_services.DataDirectory, "Reports")
                    : settings.ReportLocation,
                ReportFormats = settings.ReportFormats
            }, _cts.Token);

            ReportPath = _lastResult.PrimaryReportPath;
            ApplyStats(_lastResult.Statistics);
            var outcome = _lastResult.Outcome switch
            {
                SessionOutcome.Cancelled => "Processing cancelled. A partial report was saved.",
                SessionOutcome.CompletedWithErrors => "Finished with errors. See the report for file-level details.",
                _ => "Processing complete. Original Input files were not modified in Copy mode."
            };
            ShowBanner(_lastResult.Outcome == SessionOutcome.Completed ? "ok" : "warn", outcome);
        }
        catch (Exception ex)
        {
            ShowBanner("error", ex.Message);
        }
        finally
        {
            IsBusy = false;
            IsProcessing = false;
        }
    }

    [RelayCommand]
    private void Cancel()
    {
        _cts?.Cancel();
        StatusMessage = "Cancelling…";
    }

    [RelayCommand]
    private void OpenReport()
    {
        if (!string.IsNullOrWhiteSpace(ReportPath))
            _services.Dialogs.OpenPath(ReportPath);
    }

    [RelayCommand]
    private void ClearPlan()
    {
        _plan = null;
        HasPlan = false;
        Items.Clear();
        ReportPath = null;
        ProgressPercent = 0;
        ProgressText = "Waiting";
        StatusMessage = "Select Input and Output, then Analyze. Nothing is copied until you start processing.";
        Banner = string.Empty;
    }

    private void SetInput(IReadOnlyList<string> paths, string display)
    {
        InputPaths = paths.ToArray();
        InputPath = display;
        InputSummary = paths.Count == 1
            ? paths[0]
            : $"{paths.Count} items selected";
        PersistPaths();
        HasPlan = false;
        _plan = null;
    }

    private IReadOnlyList<string> ResolveInputs()
    {
        if (InputPaths.Count > 0)
            return InputPaths;
        return string.IsNullOrWhiteSpace(InputPath) ? Array.Empty<string>() : new[] { InputPath };
    }

    private void PersistPaths()
    {
        _settings.DefaultInputDirectory = ExistingDirectory(InputPath) ?? InputPath;
        _settings.DefaultOutputDirectory = OutputPath;
        _settings.RecursiveScanning = Recursive;
        _settings.TransferMode = TransferMode;
        _settings.DuplicateHandling = DuplicateHandling;
        _services.Settings.Save(_settings);
    }

    private void ApplyProgress(ProgressSnapshot snapshot)
    {
        ApplyStats(snapshot.Statistics);
        ProgressPercent = snapshot.Statistics.PercentComplete;
        ProgressText = snapshot.Message;
        if (snapshot.IsCompleted)
            StatusMessage = snapshot.Message;
    }

    private void ApplyStats(ProcessingStatistics stats)
    {
        TotalFiles = stats.TotalFiles;
        MatchedFiles = stats.MatchedFiles;
        UnmatchedFiles = stats.UnmatchedFiles;
        CopiedFiles = stats.CopiedFiles;
        SkippedFiles = stats.SkippedFiles;
        ErrorFiles = stats.FailedFiles;
    }

    private bool FilterItem(object obj)
    {
        if (obj is not ProcessingPlanItem item)
            return false;
        return Filter switch
        {
            "Matched" => item.Status is ItemStatus.Matched or ItemStatus.Completed or ItemStatus.Copying,
            "Unmatched" => item.Status == ItemStatus.Unmatched,
            "Duplicates" => item.DestinationExistedAtAnalysis || item.DuplicateStatus != DuplicateStatus.None,
            "Errors" => item.Status == ItemStatus.Error,
            "Skipped" => item.Status is ItemStatus.Skipped or ItemStatus.AlreadyExists,
            _ => true
        };
    }

    private void ShowBanner(string kind, string message)
    {
        BannerKind = kind;
        Banner = message;
        StatusMessage = message.Replace(Environment.NewLine, " ");
    }

    private void CancelToken()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
    }

    private static string? ExistingDirectory(string path)
    {
        if (Directory.Exists(path))
            return path;
        if (File.Exists(path))
            return Path.GetDirectoryName(path);
        return Directory.Exists(Path.GetDirectoryName(path) ?? "") ? Path.GetDirectoryName(path) : null;
    }

    private static void Dispatch(Action action)
    {
        var dispatcher = Application.Current?.Dispatcher;
        if (dispatcher is null || dispatcher.CheckAccess())
            action();
        else
            dispatcher.Invoke(action);
    }
}
