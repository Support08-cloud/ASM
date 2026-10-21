using Vision360.BulkExtractor.Matching;

namespace Vision360.BulkExtractor.Copying;

public static class CopySizeEstimator
{
    public static long Estimate(IReadOnlyList<PlannedMatch> plan, ConflictPolicy policy, CancellationToken cancellationToken)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        long total = 0;
        foreach (var match in plan)
        {
            cancellationToken.ThrowIfCancellationRequested();
            switch (match.Kind)
            {
                case MatchKind.File:
                    AddFile(match.SourcePath, match.DestinationPath);
                    break;
                case MatchKind.Folder:
                    AddTree(match.SourcePath, match.DestinationPath);
                    break;
                default:
                    throw UnknownKind(match.Kind);
            }
        }

        return total;

        void AddTree(string sourceRoot, string destinationRoot)
        {
            var pending = new Stack<(string Source, string Destination)>();
            pending.Push((sourceRoot, destinationRoot));
            while (pending.Count > 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var (source, destination) = pending.Pop();
                List<string> entries;
                try
                {
                    entries = Directory.EnumerateFileSystemEntries(source).ToList();
                }
                catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
                {
                    _ = exception;
                    continue;
                }

                foreach (var entry in entries)
                {
                    FileAttributes attributes;
                    try
                    {
                        attributes = File.GetAttributes(entry);
                    }
                    catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
                    {
                        _ = exception;
                        continue;
                    }

                    if ((attributes & FileAttributes.ReparsePoint) != 0)
                    {
                        continue;
                    }

                    var target = Path.Combine(destination, Path.GetFileName(entry));
                    if ((attributes & FileAttributes.Directory) != 0)
                    {
                        pending.Push((entry, target));
                        continue;
                    }

                    AddFile(entry, target);
                }
            }
        }

        void AddFile(string source, string destination)
        {
            if (!seen.Add(destination))
            {
                return;
            }

            var exists = File.Exists(destination);
            switch (policy)
            {
                case ConflictPolicy.SkipExisting when exists:
                    return;
                case ConflictPolicy.SkipExisting:
                case ConflictPolicy.Overwrite:
                    break;
                default:
                    throw UnknownPolicy(policy);
            }

            try
            {
                var info = new FileInfo(source);
                if (info.Exists)
                {
                    total += info.Length;
                }
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                _ = exception;
            }
        }
    }

    private static Exception UnknownKind(MatchKind kind) => kind switch
    {
        MatchKind.File => new InvalidOperationException("File matches are handled."),
        MatchKind.Folder => new InvalidOperationException("Folder matches are handled."),
        _ => new ArgumentOutOfRangeException(nameof(kind), kind, "Unhandled match kind."),
    };

    private static Exception UnknownPolicy(ConflictPolicy policy) => policy switch
    {
        ConflictPolicy.SkipExisting => new InvalidOperationException("Skip is handled."),
        ConflictPolicy.Overwrite => new InvalidOperationException("Overwrite is handled."),
        _ => new ArgumentOutOfRangeException(nameof(policy), policy, "Unhandled conflict policy."),
    };
}
