using System.Buffers;
using System.Diagnostics;
using Vision360.BulkExtractor.Logging;
using Vision360.BulkExtractor.Matching;

namespace Vision360.BulkExtractor.Copying;

public sealed class BulkCopyEngine
{
    private readonly CopyPlanner _planner = new();

    public async Task<CopySummary> CopyAsync(
        string destinationRoot,
        IReadOnlyList<string> ids,
        IReadOnlyList<SourceMatch> matches,
        IReadOnlyList<string> missingIds,
        ConflictPolicy policy,
        ExtractionLog log,
        IProgress<CopyProgress>? progress,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(log);
        var started = Stopwatch.StartNew();
        var distinctIds = Distinct(ids);
        var missing = missingIds.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var missingSet = new HashSet<string>(missing, StringComparer.OrdinalIgnoreCase);

        if (matches.Count == 0)
        {
            log.Info("No matching files or folders were found. Nothing was copied.");
            var empty = BuildSummary(
                distinctIds.Count,
                succeeded: 0,
                missing: missing.Count,
                failed: 0,
                unfinished: 0,
                filesCopied: 0,
                filesSkipped: 0,
                bytesCopied: 0,
                elapsed: started.Elapsed,
                wasCancelled: false,
                noMatches: true,
                missingIds: missing,
                failedIds: [],
                log: log);
            Report(progress, empty, "No matching files or folders were found.");
            return empty;
        }

        Directory.CreateDirectory(destinationRoot);
        var plan = _planner.Plan(destinationRoot, matches, log);
        var byId = plan.GroupBy(match => match.Id, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.ToList(), StringComparer.OrdinalIgnoreCase);

        var succeeded = 0;
        var failed = 0;
        var filesCopied = 0L;
        var filesSkipped = 0L;
        var bytesCopied = 0L;
        var failedIds = new List<string>();
        var wasCancelled = false;

        try
        {
            foreach (var id in distinctIds)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (missingSet.Contains(id))
                {
                    continue;
                }

                if (!byId.TryGetValue(id, out var idMatches))
                {
                    failed++;
                    failedIds.Add(id);
                    log.Error($"Could not prepare a destination for {id}.");
                    continue;
                }

                ReportCounts(progress, distinctIds.Count, succeeded + failed, failed, missing.Count, filesCopied, filesSkipped, bytesCopied, id, $"Copying {id}");
                log.Info($"Copying {id}.");
                var idFailed = false;
                var idCopied = 0L;
                var idSkipped = 0L;

                foreach (var match in idMatches)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    switch (match.Kind)
                    {
                        case MatchKind.File:
                            await CopyListedFileAsync(match.SourcePath, match.DestinationPath).ConfigureAwait(false);
                            break;
                        case MatchKind.Folder:
                            await CopyFolderAsync(match.SourcePath, match.DestinationPath).ConfigureAwait(false);
                            break;
                        default:
                            throw UnknownKind(match.Kind);
                    }
                }

                if (idFailed)
                {
                    failed++;
                    failedIds.Add(id);
                    log.Error($"Failed to copy every file for {id}. Copied {idCopied}, skipped {idSkipped}.");
                }
                else
                {
                    succeeded++;
                    log.Info($"Finished {id}. Copied {idCopied} file(s), skipped {idSkipped}.");
                }

                ReportCounts(progress, distinctIds.Count, succeeded + failed, failed, missing.Count, filesCopied, filesSkipped, bytesCopied, id, $"Finished {id}");

                async Task CopyListedFileAsync(string source, string destination)
                {
                    var result = await CopyFileAsync(source, destination, policy, log, cancellationToken, copiedBytes =>
                    {
                        ReportCounts(
                            progress,
                            distinctIds.Count,
                            succeeded + failed,
                            failed,
                            missing.Count,
                            filesCopied,
                            filesSkipped,
                            bytesCopied + copiedBytes,
                            id,
                            $"Copying {id}");
                    }).ConfigureAwait(false);
                    Apply(result, ref idFailed, ref idCopied, ref idSkipped);
                }

                async Task CopyFolderAsync(string source, string destination)
                {
                    Directory.CreateDirectory(destination);
                    var files = CollectFiles(source, destination, log, cancellationToken, ref idFailed);
                    foreach (var (fileSource, fileDestination) in files)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        var result = await CopyFileAsync(fileSource, fileDestination, policy, log, cancellationToken, copiedBytes =>
                        {
                            ReportCounts(
                                progress,
                                distinctIds.Count,
                                succeeded + failed,
                                failed,
                                missing.Count,
                                filesCopied,
                                filesSkipped,
                                bytesCopied + copiedBytes,
                                id,
                                $"Copying {id}");
                        }).ConfigureAwait(false);
                        Apply(result, ref idFailed, ref idCopied, ref idSkipped);
                    }
                }

                void Apply(FileCopyResult result, ref bool failedFlag, ref long copied, ref long skipped)
                {
                    switch (result.Status)
                    {
                        case FileCopyStatus.Copied:
                            copied++;
                            filesCopied++;
                            bytesCopied += result.Bytes;
                            break;
                        case FileCopyStatus.Skipped:
                            skipped++;
                            filesSkipped++;
                            break;
                        case FileCopyStatus.Failed:
                            failedFlag = true;
                            break;
                        default:
                            throw UnknownStatus(result.Status);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            wasCancelled = true;
            log.Info("Copy cancelled. Source files were not changed. Files already written were left in the destination.");
        }

        var unfinished = distinctIds.Count - succeeded - failed - missing.Count;
        if (unfinished < 0)
        {
            unfinished = 0;
        }

        var summary = BuildSummary(
            distinctIds.Count,
            succeeded,
            missing.Count,
            failed,
            unfinished,
            filesCopied,
            filesSkipped,
            bytesCopied,
            started.Elapsed,
            wasCancelled,
            false,
            missing,
            failedIds,
            log);
        var message = wasCancelled
            ? "Copy cancelled."
            : failed > 0
                ? "Finished with errors."
                : "Copy finished.";
        Report(progress, summary, message);
        return summary;
    }

    private static List<(string Source, string Destination)> CollectFiles(
        string sourceRoot,
        string destinationRoot,
        ExtractionLog log,
        CancellationToken cancellationToken,
        ref bool idFailed)
    {
        var files = new List<(string Source, string Destination)>();
        var pending = new Stack<(string Source, string Destination)>();
        pending.Push((sourceRoot, destinationRoot));
        while (pending.Count > 0)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var (source, destination) = pending.Pop();
            try
            {
                Directory.CreateDirectory(destination);
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                idFailed = true;
                log.Error($"Could not create folder {destination}: {exception.Message}");
                continue;
            }

            List<string> entries;
            try
            {
                entries = Directory.EnumerateFileSystemEntries(source).ToList();
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                idFailed = true;
                log.Error($"Could not read folder {source}: {exception.Message}");
                continue;
            }

            foreach (var entry in entries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                FileAttributes attributes;
                try
                {
                    attributes = File.GetAttributes(entry);
                }
                catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
                {
                    idFailed = true;
                    log.Error($"Could not read {entry}: {exception.Message}");
                    continue;
                }

                var target = Path.Combine(destination, Path.GetFileName(entry));
                if ((attributes & FileAttributes.ReparsePoint) != 0)
                {
                    log.Info($"Skipped link {entry}.");
                    continue;
                }

                if ((attributes & FileAttributes.Directory) != 0)
                {
                    pending.Push((entry, target));
                    continue;
                }

                files.Add((entry, target));
            }
        }

        return files;
    }

    private static async Task<FileCopyResult> CopyFileAsync(
        string source,
        string destination,
        ConflictPolicy policy,
        ExtractionLog log,
        CancellationToken cancellationToken,
        Action<long> reportInFlight)
    {
        try
        {
            var parent = Path.GetDirectoryName(destination);
            if (!string.IsNullOrEmpty(parent))
            {
                Directory.CreateDirectory(parent);
            }

            if (File.Exists(destination))
            {
                switch (policy)
                {
                    case ConflictPolicy.SkipExisting:
                        log.Info($"Skipped existing file: {destination}");
                        return new FileCopyResult(FileCopyStatus.Skipped, 0);
                    case ConflictPolicy.Overwrite:
                        break;
                    default:
                        throw UnknownPolicy(policy);
                }
            }

            var temp = Path.Combine(parent ?? destination, ".v360-" + Guid.NewGuid().ToString("N") + ".partial");
            long written = 0;
            try
            {
                const int bufferSize = 1024 * 1024;
                await using (var input = new FileStream(
                    source,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.Read,
                    bufferSize,
                    FileOptions.Asynchronous | FileOptions.SequentialScan))
                await using (var output = new FileStream(
                    temp,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.None,
                    bufferSize,
                    FileOptions.Asynchronous | FileOptions.SequentialScan))
                {
                    var buffer = ArrayPool<byte>.Shared.Rent(bufferSize);
                    try
                    {
                        while (true)
                        {
                            cancellationToken.ThrowIfCancellationRequested();
                            var read = await input.ReadAsync(buffer.AsMemory(0, bufferSize), cancellationToken).ConfigureAwait(false);
                            if (read == 0)
                            {
                                break;
                            }

                            await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
                            written += read;
                            reportInFlight(written);
                        }
                    }
                    finally
                    {
                        ArrayPool<byte>.Shared.Return(buffer);
                    }
                }

                File.Move(temp, destination, overwrite: true);
                try
                {
                    File.SetLastWriteTimeUtc(destination, File.GetLastWriteTimeUtc(source));
                }
                catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
                {
                    log.Info($"Copied {destination}, but the timestamp could not be kept.");
                }

                return new FileCopyResult(FileCopyStatus.Copied, written);
            }
            catch
            {
                TryDelete(temp);
                throw;
            }
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            log.Error($"Failed to copy {source} to {destination}: {exception.Message}");
            return new FileCopyResult(FileCopyStatus.Failed, 0);
        }
    }

    private static CopySummary BuildSummary(
        int totalIds,
        int succeeded,
        int missing,
        int failed,
        int unfinished,
        long filesCopied,
        long filesSkipped,
        long bytesCopied,
        TimeSpan elapsed,
        bool wasCancelled,
        bool noMatches,
        IReadOnlyList<string> missingIds,
        IReadOnlyList<string> failedIds,
        ExtractionLog log)
    {
        var summary = new CopySummary
        {
            TotalIds = totalIds,
            SucceededIds = succeeded,
            MissingIds = missing,
            FailedIds = failed,
            UnfinishedIds = unfinished,
            FilesCopied = filesCopied,
            FilesSkipped = filesSkipped,
            BytesCopied = bytesCopied,
            Elapsed = elapsed,
            WasCancelled = wasCancelled,
            NoMatches = noMatches,
            MissingIdList = missingIds,
            FailedIdList = failedIds,
            LogText = log.Text,
        };
        log.Info(summary.FormatReport().Replace(Environment.NewLine, " | ", StringComparison.Ordinal));
        return summary with { LogText = log.Text };
    }

    private static void Report(IProgress<CopyProgress>? progress, CopySummary summary, string message)
    {
        progress?.Report(new CopyProgress(
            null,
            summary.TotalIds,
            summary.SucceededIds + summary.FailedIds,
            summary.FailedIds,
            summary.MissingIds,
            summary.FilesCopied,
            summary.FilesSkipped,
            summary.BytesCopied,
            message));
    }

    private static void ReportCounts(
        IProgress<CopyProgress>? progress,
        int total,
        int completed,
        int failed,
        int missing,
        long filesCopied,
        long filesSkipped,
        long bytes,
        string currentId,
        string message)
    {
        progress?.Report(new CopyProgress(currentId, total, completed, failed, missing, filesCopied, filesSkipped, bytes, message));
    }

    private static List<string> Distinct(IReadOnlyList<string> ids)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ordered = new List<string>();
        foreach (var id in ids)
        {
            var trimmed = id.Trim();
            if (trimmed.Length > 0 && seen.Add(trimmed))
            {
                ordered.Add(trimmed);
            }
        }

        return ordered;
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _ = exception;
        }
    }

    private static Exception UnknownKind(MatchKind kind) => kind switch
    {
        MatchKind.File => new InvalidOperationException("File matches are handled."),
        MatchKind.Folder => new InvalidOperationException("Folder matches are handled."),
        _ => new ArgumentOutOfRangeException(nameof(kind), kind, "Unhandled match kind."),
    };

    private static Exception UnknownStatus(FileCopyStatus status) => status switch
    {
        FileCopyStatus.Copied => new InvalidOperationException("Copied is handled."),
        FileCopyStatus.Skipped => new InvalidOperationException("Skipped is handled."),
        FileCopyStatus.Failed => new InvalidOperationException("Failed is handled."),
        _ => new ArgumentOutOfRangeException(nameof(status), status, "Unhandled copy status."),
    };

    private static Exception UnknownPolicy(ConflictPolicy policy) => policy switch
    {
        ConflictPolicy.SkipExisting => new InvalidOperationException("Skip is handled."),
        ConflictPolicy.Overwrite => new InvalidOperationException("Overwrite is handled."),
        _ => new ArgumentOutOfRangeException(nameof(policy), policy, "Unhandled conflict policy."),
    };

    private enum FileCopyStatus
    {
        Copied,
        Skipped,
        Failed,
    }

    private readonly record struct FileCopyResult(FileCopyStatus Status, long Bytes);
}
