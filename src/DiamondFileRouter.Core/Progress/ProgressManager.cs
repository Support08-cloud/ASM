using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Progress;

public sealed class ProgressManager
{
    private readonly object _gate = new();
    private readonly ProcessingStatistics _stats = new();

    public event EventHandler<ProgressSnapshot>? Changed;

    public ProcessingStatistics Snapshot()
    {
        lock (_gate)
            return _stats.Clone();
    }

    public void Reset(int totalFiles)
    {
        lock (_gate)
        {
            _stats.TotalFiles = totalFiles;
            _stats.ProcessedFiles = 0;
            _stats.MatchedFiles = 0;
            _stats.CopiedFiles = 0;
            _stats.SkippedFiles = 0;
            _stats.AlreadyExistingFiles = 0;
            _stats.UnmatchedFiles = 0;
            _stats.FailedFiles = 0;
            _stats.CancelledFiles = 0;
            _stats.MovedFiles = 0;
            _stats.BytesCopied = 0;
            _stats.Duration = TimeSpan.Zero;
        }
    }

    public void Record(ProcessingPlanItem item, long bytesCopied = 0)
    {
        lock (_gate)
        {
            _stats.ProcessedFiles++;
            _stats.BytesCopied += bytesCopied;
            switch (item.Status)
            {
                case ItemStatus.Completed:
                    _stats.MatchedFiles++;
                    _stats.CopiedFiles++;
                    if (item.Reason == "Moved")
                        _stats.MovedFiles++;
                    break;
                case ItemStatus.Skipped:
                    _stats.SkippedFiles++;
                    if (item.DuplicateStatus is DuplicateStatus.Skipped or DuplicateStatus.AlreadyExists)
                        _stats.AlreadyExistingFiles++;
                    _stats.MatchedFiles++;
                    break;
                case ItemStatus.AlreadyExists:
                    _stats.AlreadyExistingFiles++;
                    _stats.SkippedFiles++;
                    _stats.MatchedFiles++;
                    break;
                case ItemStatus.Unmatched:
                    _stats.UnmatchedFiles++;
                    break;
                case ItemStatus.Error:
                    _stats.FailedFiles++;
                    break;
                case ItemStatus.Cancelled:
                    _stats.CancelledFiles++;
                    break;
            }
        }
    }

    public void SetDuration(TimeSpan duration)
    {
        lock (_gate)
            _stats.Duration = duration;
    }

    public void Publish(string message, ProcessingPlanItem? current = null, bool completed = false, bool cancelled = false)
    {
        Changed?.Invoke(this, new ProgressSnapshot
        {
            Statistics = Snapshot(),
            CurrentItem = current,
            Message = message,
            IsCompleted = completed,
            IsCancelled = cancelled
        });
    }
}
