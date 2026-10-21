using System.Collections.ObjectModel;
using System.IO;
using System.Windows.Input;
using Vision360.BulkExtractor.Copying;
using Vision360.BulkExtractor.Dialogs;
using Vision360.BulkExtractor.Excel;
using Vision360.BulkExtractor.Logging;
using Vision360.BulkExtractor.Matching;
using Vision360.BulkExtractor.Text;
using Vision360.BulkExtractor.Validation;

namespace Vision360.BulkExtractor.ViewModels;

public enum ResultTone
{
    Neutral,
    Success,
    Warning,
    Error,
}

public sealed class MainViewModel : ObservableObject
{
    private readonly ExcelTemplateWriter _templateWriter;
    private readonly ExcelNameIdReader _reader;
    private readonly SourceMatcher _matcher;
    private readonly BulkCopyEngine _engine;
    private readonly CopyPlanner _planner;
    private readonly IUserDialogs _dialogs;
    private readonly RelayCommand _downloadCommand;
    private readonly RelayCommand _uploadCommand;
    private readonly RelayCommand _clearCommand;
    private readonly RelayCommand _browseSourceCommand;
    private readonly RelayCommand _browseDestinationCommand;
    private readonly RelayCommand _startCommand;
    private readonly RelayCommand _cancelCommand;
    private readonly RelayCommand _viewLogCommand;
    private readonly RelayCommand _copyResultsCommand;
    private CancellationTokenSource? _cancellation;
    private List<string> _ids = [];

    private string _sourcePath = "";
    private string _destinationPath = "";
    private string _excelFileName = "No Excel file uploaded";
    private string _filterText = "";
    private string _statusText = "Upload an Excel file to begin.";
    private string _errorText = "";
    private string _currentId = "—";
    private string _bytesCopiedText = "0 bytes";
    private string _elapsedText = "—";
    private string _resultHeadline = "Results";
    private string _resultDetail = "Success, missing, and failed counts appear here after copying.";
    private string _logText = "";
    private string? _logFilePath;
    private string? _resultsText;
    private bool _hasImport;
    private string? _importError;
    private bool _isBusy;
    private bool _overwriteExisting;
    private bool _progressIndeterminate;
    private int _duplicateCount;
    private int _emptyRowCount;
    private int _visibleCount;
    private int _totalIds;
    private int _completedIds;
    private int _failedIds;
    private int _missingIds;
    private long _filesCopied;
    private long _filesSkipped;
    private double _progressValue;
    private ResultTone _resultTone = ResultTone.Neutral;

    public MainViewModel(
        ExcelTemplateWriter templateWriter,
        ExcelNameIdReader reader,
        SourceMatcher matcher,
        BulkCopyEngine engine,
        CopyPlanner planner,
        IUserDialogs dialogs)
    {
        _templateWriter = templateWriter;
        _reader = reader;
        _matcher = matcher;
        _engine = engine;
        _planner = planner;
        _dialogs = dialogs;
        Rows = new ObservableCollection<IdRow>();
        _downloadCommand = new RelayCommand(DownloadTemplate, () => IsIdle);
        _uploadCommand = new RelayCommand(UploadExcel, () => IsIdle);
        _clearCommand = new RelayCommand(ClearList, () => IsIdle && _ids.Count > 0);
        _browseSourceCommand = new RelayCommand(() => BrowseFolder(isSource: true), () => IsIdle);
        _browseDestinationCommand = new RelayCommand(() => BrowseFolder(isSource: false), () => IsIdle);
        _startCommand = new RelayCommand(() => _ = StartAsync(), () => IsIdle);
        _cancelCommand = new RelayCommand(Cancel, () => IsBusy);
        _viewLogCommand = new RelayCommand(ViewLog, () => LogText.Length > 0);
        _copyResultsCommand = new RelayCommand(CopyResults, () => !string.IsNullOrWhiteSpace(_resultsText));
    }

    public ObservableCollection<IdRow> Rows { get; private set; }

    public ICommand DownloadTemplateCommand => _downloadCommand;

    public ICommand UploadExcelCommand => _uploadCommand;

    public ICommand ClearListCommand => _clearCommand;

    public ICommand BrowseSourceCommand => _browseSourceCommand;

    public ICommand BrowseDestinationCommand => _browseDestinationCommand;

    public ICommand StartCopyCommand => _startCommand;

    public ICommand CancelCommand => _cancelCommand;

    public ICommand ViewLogCommand => _viewLogCommand;

    public ICommand CopyResultsCommand => _copyResultsCommand;

    public string SourcePath
    {
        get => _sourcePath;
        set => SetProperty(ref _sourcePath, value);
    }

    public string DestinationPath
    {
        get => _destinationPath;
        set => SetProperty(ref _destinationPath, value);
    }

    public string ExcelFileName
    {
        get => _excelFileName;
        private set => SetProperty(ref _excelFileName, value);
    }

    public string FilterText
    {
        get => _filterText;
        set
        {
            if (SetProperty(ref _filterText, value))
            {
                RefreshRows();
            }
        }
    }

    public string StatusText
    {
        get => _statusText;
        private set => SetProperty(ref _statusText, value);
    }

    public string ErrorText
    {
        get => _errorText;
        private set => SetProperty(ref _errorText, value);
    }

    public string CurrentId
    {
        get => _currentId;
        private set => SetProperty(ref _currentId, value);
    }

    public string BytesCopiedText
    {
        get => _bytesCopiedText;
        private set => SetProperty(ref _bytesCopiedText, value);
    }

    public string ElapsedText
    {
        get => _elapsedText;
        private set => SetProperty(ref _elapsedText, value);
    }

    public string ResultHeadline
    {
        get => _resultHeadline;
        private set => SetProperty(ref _resultHeadline, value);
    }

    public string ResultDetail
    {
        get => _resultDetail;
        private set => SetProperty(ref _resultDetail, value);
    }

    public string LogText
    {
        get => _logText;
        private set => SetProperty(ref _logText, value);
    }

    public int DuplicateCount
    {
        get => _duplicateCount;
        private set => SetProperty(ref _duplicateCount, value);
    }

    public int EmptyRowCount
    {
        get => _emptyRowCount;
        private set => SetProperty(ref _emptyRowCount, value);
    }

    public int VisibleCount
    {
        get => _visibleCount;
        private set => SetProperty(ref _visibleCount, value);
    }

    public int ValidIdCount => _ids.Count;

    public int TotalIds
    {
        get => _totalIds;
        private set => SetProperty(ref _totalIds, value);
    }

    public int CompletedIds
    {
        get => _completedIds;
        private set => SetProperty(ref _completedIds, value);
    }

    public int FailedIds
    {
        get => _failedIds;
        private set => SetProperty(ref _failedIds, value);
    }

    public int MissingIds
    {
        get => _missingIds;
        private set => SetProperty(ref _missingIds, value);
    }

    public long FilesCopied
    {
        get => _filesCopied;
        private set => SetProperty(ref _filesCopied, value);
    }

    public long FilesSkipped
    {
        get => _filesSkipped;
        private set => SetProperty(ref _filesSkipped, value);
    }

    public double ProgressValue
    {
        get => _progressValue;
        private set => SetProperty(ref _progressValue, value);
    }

    public bool IsProgressIndeterminate
    {
        get => _progressIndeterminate;
        private set => SetProperty(ref _progressIndeterminate, value);
    }

    public bool OverwriteExisting
    {
        get => _overwriteExisting;
        set => SetProperty(ref _overwriteExisting, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        private set
        {
            if (SetProperty(ref _isBusy, value))
            {
                OnPropertyChanged(nameof(IsIdle));
                RaiseCommands();
            }
        }
    }

    public bool IsIdle => !IsBusy;

    public ResultTone ResultTone
    {
        get => _resultTone;
        private set => SetProperty(ref _resultTone, value);
    }

    public string ImportSummary =>
        _hasImport
            ? $"{ValidIdCount} valid ID(s), {DuplicateCount} duplicate(s) skipped, {EmptyRowCount} empty row(s)"
            : "Download the template, fill in NAME ID, then upload the file.";

    private void DownloadTemplate()
    {
        var path = _dialogs.ChooseTemplateSavePath();
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            _templateWriter.WriteFile(path);
            ErrorText = "";
            StatusText = $"Template saved to {path}";
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            ErrorText = "Could not save the template. Choose a writable location.";
        }
    }

    private void UploadExcel()
    {
        var path = _dialogs.ChooseExcelOpenPath();
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            var imported = _reader.ReadFile(path);
            _ids = imported.Ids.ToList();
            _hasImport = true;
            _importError = null;
            ExcelFileName = imported.FileName;
            DuplicateCount = imported.DuplicateCount;
            EmptyRowCount = imported.EmptyRowCount;
            FilterText = "";
            RefreshRows();
            ClearRunState();
            ErrorText = imported.Warning ?? "";
            StatusText = imported.Warning ?? $"Loaded {imported.ValidIdCount} ID(s) from {imported.FileName}. Copying has not started.";
            OnPropertyChanged(nameof(ValidIdCount));
            OnPropertyChanged(nameof(ImportSummary));
            RaiseCommands();
        }
        catch (Exception exception)
        {
            RememberFailedImport(path, exception.Message);
        }
    }

    private void RememberFailedImport(string path, string message)
    {
        _ids = [];
        _hasImport = false;
        _importError = message;
        ExcelFileName = Path.GetFileName(path);
        DuplicateCount = 0;
        EmptyRowCount = 0;
        RefreshRows();
        OnPropertyChanged(nameof(ValidIdCount));
        OnPropertyChanged(nameof(ImportSummary));
        ErrorText = message;
        StatusText = "The Excel file was not imported.";
        RaiseCommands();
    }

    private void ClearList()
    {
        _ids = [];
        _hasImport = false;
        _importError = null;
        ExcelFileName = "No Excel file uploaded";
        DuplicateCount = 0;
        EmptyRowCount = 0;
        FilterText = "";
        RefreshRows();
        ClearRunState();
        ErrorText = "";
        StatusText = "The ID list is clear.";
        OnPropertyChanged(nameof(ValidIdCount));
        OnPropertyChanged(nameof(ImportSummary));
        RaiseCommands();
    }

    private void BrowseFolder(bool isSource)
    {
        var current = isSource ? SourcePath : DestinationPath;
        var selected = _dialogs.ChooseFolder(isSource ? "Select source folder" : "Select destination folder", current);
        if (string.IsNullOrWhiteSpace(selected))
        {
            return;
        }

        if (isSource)
        {
            SourcePath = selected;
        }
        else
        {
            DestinationPath = selected;
        }
    }

    private async Task StartAsync()
    {
        ErrorText = "";
        var validation = OperationValidator.Validate(new OperationInput(_hasImport, _ids.Count, SourcePath, DestinationPath));
        if (!validation.CanStart)
        {
            ErrorText = string.Join(Environment.NewLine, DescribeValidation(validation.Errors));
            StatusText = "Fix the items above before copying.";
            return;
        }

        _cancellation = new CancellationTokenSource();
        var token = _cancellation.Token;
        IsBusy = true;
        ClearRunState();
        RaiseCommands();
        IsProgressIndeterminate = true;
        StatusText = "Scanning the source folder…";
        var log = new ExtractionLog();
        log.Info($"Excel file: {ExcelFileName}");
        log.Info($"Source: {SourcePath.Trim()}");
        log.Info($"Destination: {DestinationPath.Trim()}");
        log.Info(OverwriteExisting
            ? "Existing files will be overwritten."
            : "Existing files will be skipped.");

        try
        {
            var progress = new Progress<ScanProgress>(update =>
            {
                StatusText = $"Scanning… {update.DirectoriesVisited} folder(s) visited, {update.MatchesFound} match(es)";
            });
            var scan = await Task.Run(
                () => _matcher.Scan(SourcePath.Trim(), _ids, progress, token),
                token).ConfigureAwait(true);

            foreach (var warning in scan.Warnings)
            {
                log.Info(warning);
            }

            if (scan.Matches.Count == 0)
            {
                log.Info("No matching files or folders were found. Nothing was copied.");
                RememberLog(log);
                ApplyIdleResult(
                    ResultTone.Warning,
                    "No matching data",
                    "None of the NAME IDs matched a file or folder in the source. Nothing was copied.",
                    BuildNoMatchReport(scan.MissingIds));
                MissingIds = scan.MissingIds.Count;
                TotalIds = _ids.Count;
                StatusText = "No matching data found. Nothing was copied.";
                return;
            }

            StatusText = "Measuring the data to copy…";
            var policy = OverwriteExisting ? ConflictPolicy.Overwrite : ConflictPolicy.SkipExisting;
            var plan = await Task.Run(() => _planner.Plan(DestinationPath.Trim(), scan.Matches, null), token).ConfigureAwait(true);
            var estimated = await Task.Run(() => CopySizeEstimator.Estimate(plan, policy, token), token).ConfigureAwait(true);
            var free = OperationValidator.TryGetAvailableBytes(DestinationPath.Trim());
            var spaceError = OperationValidator.FreeSpaceError(estimated, free);
            if (spaceError is not null)
            {
                ErrorText = spaceError;
                StatusText = "Not enough free space.";
                RememberLog(log);
                return;
            }

            var confirm = _dialogs.ConfirmCopy(BuildConfirmMessage(scan, estimated, validation.DestinationWillBeCreated), OverwriteExisting);
            if (!confirm)
            {
                StatusText = "Copy was not started.";
                RememberLog(log);
                return;
            }

            IsProgressIndeterminate = false;
            var copyProgress = new Progress<CopyProgress>(ApplyProgress);
            var summary = await _engine.CopyAsync(
                DestinationPath.Trim(),
                _ids,
                scan.Matches,
                scan.MissingIds,
                policy,
                log,
                copyProgress,
                token).ConfigureAwait(true);

            string? logPath = null;
            try
            {
                logPath = log.Save();
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                logPath = null;
            }

            ShowSummary(summary with { LogFilePath = logPath, LogText = log.Text });
        }
        catch (OperationCanceledException)
        {
            RememberLog(log);
            StatusText = "Cancelled.";
            ResultTone = ResultTone.Warning;
            ResultHeadline = "Cancelled";
            ResultDetail = "The operation was cancelled. Source files were not changed.";
            _resultsText = ResultDetail;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            ErrorText = exception.Message;
            StatusText = "The copy could not continue.";
            RememberLog(log);
        }
        finally
        {
            IsBusy = false;
            IsProgressIndeterminate = false;
            _cancellation.Dispose();
            _cancellation = null;
            RaiseCommands();
        }
    }

    private IEnumerable<string> DescribeValidation(IReadOnlyList<string> errors)
    {
        foreach (var error in errors)
        {
            if (!_hasImport && !string.IsNullOrWhiteSpace(_importError) && error.StartsWith("Upload an Excel file", StringComparison.Ordinal))
            {
                yield return _importError;
                continue;
            }

            yield return error;
        }
    }

    private void Cancel() => _cancellation?.Cancel();

    private void ViewLog() => _dialogs.ShowLog(LogText, _logFilePath);

    private void CopyResults()
    {
        if (string.IsNullOrWhiteSpace(_resultsText))
        {
            return;
        }

        if (_dialogs.TryCopyToClipboard(_resultsText, out var error))
        {
            StatusText = "Results copied.";
            return;
        }

        ErrorText = string.IsNullOrWhiteSpace(error) ? "Could not copy the results." : error;
    }

    private void ApplyProgress(CopyProgress update)
    {
        CurrentId = string.IsNullOrWhiteSpace(update.CurrentId) ? "—" : update.CurrentId;
        TotalIds = update.TotalIds;
        CompletedIds = update.CompletedIds;
        FailedIds = update.FailedIds;
        MissingIds = update.MissingIds;
        FilesCopied = update.FilesCopied;
        FilesSkipped = update.FilesSkipped;
        BytesCopiedText = ByteText.Format(update.BytesCopied);
        StatusText = update.Message;
        if (update.TotalIds > 0)
        {
            ProgressValue = Math.Clamp(100d * update.CompletedIds / update.TotalIds, 0d, 100d);
        }
    }

    private void ShowSummary(CopySummary summary)
    {
        TotalIds = summary.TotalIds;
        CompletedIds = summary.SucceededIds + summary.FailedIds;
        FailedIds = summary.FailedIds;
        MissingIds = summary.MissingIds;
        FilesCopied = summary.FilesCopied;
        FilesSkipped = summary.FilesSkipped;
        BytesCopiedText = ByteText.Format(summary.BytesCopied);
        ElapsedText = ByteText.FormatDuration(summary.Elapsed);
        LogText = summary.LogText;
        _logFilePath = summary.LogFilePath;
        _resultsText = summary.FormatReport();
        ProgressValue = summary.WasCancelled ? ProgressValue : 100;

        if (summary.WasCancelled)
        {
            ResultTone = ResultTone.Warning;
            ResultHeadline = "Copy cancelled";
            StatusText = "Copy cancelled. Files already copied were left in the destination.";
        }
        else if (summary.NoMatches)
        {
            ResultTone = ResultTone.Warning;
            ResultHeadline = "No matching data";
            StatusText = "No matching data found. Nothing was copied.";
        }
        else if (summary.FailedIds > 0)
        {
            ResultTone = ResultTone.Error;
            ResultHeadline = "Finished with errors";
            StatusText = "Copy finished with errors.";
        }
        else
        {
            ResultTone = ResultTone.Success;
            ResultHeadline = "Copy finished";
            StatusText = "Copy finished.";
        }

        ResultDetail = summary.FormatReport();
        RaiseCommands();
    }

    private void ApplyIdleResult(ResultTone tone, string headline, string detail, string results)
    {
        ResultTone = tone;
        ResultHeadline = headline;
        ResultDetail = detail;
        _resultsText = results;
        RaiseCommands();
    }

    private void RememberLog(ExtractionLog log)
    {
        LogText = log.Text;
        try
        {
            _logFilePath = log.Save();
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logFilePath = null;
        }

        RaiseCommands();
    }

    private string BuildConfirmMessage(ScanResult scan, long estimatedBytes, bool createDestination)
    {
        var found = _ids.Count - scan.MissingIds.Count;
        var lines = new List<string>
        {
            "Start copying?",
            "",
            $"Excel: {ExcelFileName}",
            $"IDs: {_ids.Count}",
            $"Matches found: {scan.Matches.Count}",
            $"IDs with a match: {found}",
            $"IDs not found: {scan.MissingIds.Count}",
            $"Estimated data to write: {ByteText.Format(estimatedBytes)}",
            "",
            $"Source: {SourcePath.Trim()}",
            $"Destination: {DestinationPath.Trim()}",
        };
        if (createDestination)
        {
            lines.Add("The destination folder will be created.");
        }

        lines.Add(OverwriteExisting
            ? "Existing files in the destination will be overwritten."
            : "Existing files in the destination will be skipped.");
        lines.Add("Source files and folders will not be changed.");
        return string.Join(Environment.NewLine, lines);
    }

    private string BuildNoMatchReport(IReadOnlyList<string> missing)
    {
        var summary = new CopySummary
        {
            TotalIds = _ids.Count,
            MissingIds = missing.Count,
            MissingIdList = missing,
            NoMatches = true,
        };
        return summary.FormatReport();
    }

    private void RefreshRows()
    {
        var filter = FilterText.Trim();
        var rows = _ids
            .Where(id => filter.Length == 0 || id.Contains(filter, StringComparison.OrdinalIgnoreCase))
            .Select(id => new IdRow(id));
        Rows = new ObservableCollection<IdRow>(rows);
        VisibleCount = Rows.Count;
        OnPropertyChanged(nameof(Rows));
    }

    private void ClearRunState()
    {
        CurrentId = "—";
        TotalIds = 0;
        CompletedIds = 0;
        FailedIds = 0;
        MissingIds = 0;
        FilesCopied = 0;
        FilesSkipped = 0;
        BytesCopiedText = "0 bytes";
        ElapsedText = "—";
        ProgressValue = 0;
        LogText = "";
        _logFilePath = null;
        _resultsText = null;
        ResultTone = ResultTone.Neutral;
        ResultHeadline = "Results";
        ResultDetail = "Success, missing, and failed counts appear here after copying.";
    }

    private void RaiseCommands()
    {
        _downloadCommand.RaiseCanExecuteChanged();
        _uploadCommand.RaiseCanExecuteChanged();
        _clearCommand.RaiseCanExecuteChanged();
        _browseSourceCommand.RaiseCanExecuteChanged();
        _browseDestinationCommand.RaiseCanExecuteChanged();
        _startCommand.RaiseCanExecuteChanged();
        _cancelCommand.RaiseCanExecuteChanged();
        _viewLogCommand.RaiseCanExecuteChanged();
        _copyResultsCommand.RaiseCanExecuteChanged();
    }
}
