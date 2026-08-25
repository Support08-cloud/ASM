using DiamondFileRouter.Core.DuplicateHandling;
using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Models;
using DiamondFileRouter.Core.Progress;

namespace DiamondFileRouter.Core.Processing;

public interface IProcessingEngine
{
    event EventHandler<ItemUpdatedEventArgs>? ItemUpdated;
    event EventHandler<ProgressSnapshot>? ProgressChanged;

    Task<ProcessingStatistics> ProcessAsync(
        ProcessingPlan plan,
        ProcessingOptions options,
        CancellationToken cancellationToken = default);
}

public sealed class ProcessingEngine : IProcessingEngine
{
    private readonly IFileSystem _fileSystem;
    private readonly IDuplicateHandler _duplicateHandler;
    private readonly FileCopyService _copyService;
    private readonly ProgressManager _progress;

    public ProcessingEngine(
        IFileSystem fileSystem,
        IDuplicateHandler duplicateHandler,
        FileCopyService copyService,
        ProgressManager progress)
    {
        _fileSystem = fileSystem;
        _duplicateHandler = duplicateHandler;
        _copyService = copyService;
        _progress = progress;
    }

    public event EventHandler<ItemUpdatedEventArgs>? ItemUpdated;
    public event EventHandler<ProgressSnapshot>? ProgressChanged
    {
        add => _progress.Changed += value;
        remove => _progress.Changed -= value;
    }

    public async Task<ProcessingStatistics> ProcessAsync(
        ProcessingPlan plan,
        ProcessingOptions options,
        CancellationToken cancellationToken = default)
    {
        var started = DateTimeOffset.Now;
        _progress.Reset(plan.Items.Count);
        _progress.Publish("Processing started.");

        if (options.DuplicateHandling == DuplicateAction.Replace && !options.AllowReplace)
        {
            throw new InvalidOperationException("Replace is not allowed until the user confirms replacement.");
        }

        foreach (var item in plan.Items)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                if (item.Status is ItemStatus.Matched or ItemStatus.AlreadyExists or ItemStatus.Pending)
                {
                    item.Status = ItemStatus.Cancelled;
                    item.Reason = "Cancelled";
                    _progress.Record(item);
                    Raise(item);
                }
                continue;
            }

            try
            {
                await ProcessOneAsync(item, options, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                item.Status = ItemStatus.Cancelled;
                item.Reason = "Cancelled";
                _progress.Record(item);
                Raise(item);
            }
            catch (Exception ex)
            {
                item.Status = ItemStatus.Error;
                item.ErrorInformation = FileCopyService.Describe(ex);
                item.Reason = item.ErrorInformation;
                _progress.Record(item);
                Raise(item);
            }
        }

        _progress.SetDuration(DateTimeOffset.Now - started);
        var cancelled = cancellationToken.IsCancellationRequested;
        _progress.Publish(cancelled ? "Processing cancelled." : "Processing finished.", completed: true, cancelled: cancelled);
        return _progress.Snapshot();
    }

    private async Task ProcessOneAsync(ProcessingPlanItem item, ProcessingOptions options, CancellationToken cancellationToken)
    {
        if (item.Status == ItemStatus.Unmatched)
        {
            _progress.Record(item);
            _progress.Publish($"Unmatched: {item.SourceFileName}", item);
            Raise(item);
            return;
        }

        if (item.Status == ItemStatus.Error)
        {
            _progress.Record(item);
            Raise(item);
            return;
        }

        if (string.IsNullOrWhiteSpace(item.DestinationFilePath) || string.IsNullOrWhiteSpace(item.DestinationFolder))
        {
            item.Status = ItemStatus.Unmatched;
            item.Reason = "No matching Output folder found.";
            _progress.Record(item);
            Raise(item);
            return;
        }

        if (!_fileSystem.DirectoryExists(item.DestinationFolder))
        {
            item.Status = ItemStatus.Error;
            item.ErrorInformation = "Destination unavailable";
            item.Reason = "Destination unavailable";
            _progress.Record(item);
            Raise(item);
            return;
        }

        var decision = _duplicateHandler.Resolve(item.DestinationFilePath, options.DuplicateHandling);
        item.DuplicateStatus = decision.Status;
        item.DestinationFilePath = decision.DestinationPath;

        if (decision.Action == DuplicateAction.Skip && decision.Status == DuplicateStatus.Skipped)
        {
            item.Status = ItemStatus.Skipped;
            item.Reason = decision.Reason;
            _progress.Record(item);
            _progress.Publish($"Skipped: {item.SourceFileName}", item);
            Raise(item);
            return;
        }

        item.Status = ItemStatus.Copying;
        Raise(item);
        _progress.Publish($"Copying {item.SourceFileName}", item);

        var overwrite = decision.Action == DuplicateAction.Replace;
        var copy = await _copyService.CopyAsync(
            item.SourcePath,
            item.DestinationFilePath,
            overwrite,
            options.CopyBufferSizeBytes,
            cancellationToken).ConfigureAwait(false);

        if (copy.Cancelled)
        {
            item.Status = ItemStatus.Cancelled;
            item.Reason = "Cancelled";
            _progress.Record(item);
            Raise(item);
            return;
        }

        if (!copy.Success)
        {
            item.Status = ItemStatus.Error;
            item.ErrorInformation = copy.Error;
            item.Reason = copy.Error;
            _progress.Record(item);
            Raise(item);
            return;
        }

        item.DestinationFilePath = copy.DestinationPath;

        if (options.TransferMode == TransferMode.Move)
        {
            try
            {
                _fileSystem.DeleteFile(item.SourcePath);
                item.Reason = "Moved";
            }
            catch (Exception ex)
            {
                item.Status = ItemStatus.Error;
                item.ErrorInformation = "Copied but failed to remove source: " + FileCopyService.Describe(ex);
                item.Reason = item.ErrorInformation;
                _progress.Record(item, copy.BytesCopied);
                Raise(item);
                return;
            }
        }
        else
        {
            item.Reason = decision.Status == DuplicateStatus.Renamed
                ? $"Copied as {Path.GetFileName(copy.DestinationPath)}"
                : decision.Status == DuplicateStatus.Replaced
                    ? "Replaced destination file."
                    : "Copied.";
        }

        item.Status = ItemStatus.Completed;
        _progress.Record(item, copy.BytesCopied);
        _progress.Publish($"Completed {item.SourceFileName}", item);
        Raise(item);
    }

    private void Raise(ProcessingPlanItem item) =>
        ItemUpdated?.Invoke(this, new ItemUpdatedEventArgs { Item = item });
}
