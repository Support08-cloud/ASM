namespace Vision360.BulkExtractor.Matching;

public enum MatchKind
{
    File,
    Folder,
}

public sealed record SourceMatch(string Id, string RelativePath, string FullPath, MatchKind Kind);

public sealed record ScanProgress(int DirectoriesVisited, int MatchesFound);

public sealed record ScanResult(
    IReadOnlyList<SourceMatch> Matches,
    IReadOnlyList<string> MissingIds,
    IReadOnlyList<string> Warnings);

public static class NameRules
{
    public static bool TryMatchFolder(string directoryName, IReadOnlyDictionary<string, string> ids, out string id)
    {
        if (directoryName is "." or "..")
        {
            id = "";
            return false;
        }

        return ids.TryGetValue(directoryName, out id!);
    }

    public static bool TryMatchFile(string fileName, IReadOnlyDictionary<string, string> ids, out string id)
    {
        if (ids.TryGetValue(fileName, out id!))
        {
            return true;
        }

        var stem = Path.GetFileNameWithoutExtension(fileName);
        if (stem.Length > 0 && !string.Equals(stem, fileName, StringComparison.OrdinalIgnoreCase))
        {
            return ids.TryGetValue(stem, out id!);
        }

        id = "";
        return false;
    }
}

public sealed class SourceMatcher
{
    public ScanResult Scan(
        string sourceRoot,
        IReadOnlyList<string> ids,
        IProgress<ScanProgress>? progress,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sourceRoot))
        {
            throw new ArgumentException("A source folder is required.", nameof(sourceRoot));
        }

        var fullRoot = Path.GetFullPath(sourceRoot);
        if (!Directory.Exists(fullRoot))
        {
            throw new DirectoryNotFoundException($"Source folder does not exist: {fullRoot}");
        }

        var lookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var orderedIds = new List<string>();
        foreach (var raw in ids)
        {
            var trimmed = raw.Trim();
            if (trimmed.Length == 0 || !lookup.TryAdd(trimmed, trimmed))
            {
                continue;
            }

            orderedIds.Add(trimmed);
        }

        var matches = new List<SourceMatch>();
        var matchedIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var warnings = new List<string>();
        var directories = 0;

        Walk(fullRoot);

        progress?.Report(new ScanProgress(directories, matches.Count));
        var missing = orderedIds.Where(id => !matchedIds.Contains(id)).ToList();
        return new ScanResult(matches, missing, warnings);

        void Walk(string directory)
        {
            cancellationToken.ThrowIfCancellationRequested();
            directories++;
            if (directories % 40 == 0)
            {
                progress?.Report(new ScanProgress(directories, matches.Count));
            }

            List<string> entries;
            try
            {
                entries = Directory.EnumerateFileSystemEntries(directory).ToList();
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                warnings.Add($"Could not read folder {directory}: {exception.Message}");
                return;
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
                    warnings.Add($"Could not read {entry}: {exception.Message}");
                    continue;
                }

                var name = Path.GetFileName(entry);
                var isDirectory = (attributes & FileAttributes.Directory) != 0;
                var isLink = (attributes & FileAttributes.ReparsePoint) != 0;
                if (isLink)
                {
                    warnings.Add($"Skipped link {entry}.");
                    continue;
                }

                if (isDirectory)
                {
                    if (NameRules.TryMatchFolder(name, lookup, out var folderId))
                    {
                        matches.Add(new SourceMatch(folderId, Relative(entry), entry, MatchKind.Folder));
                        matchedIds.Add(folderId);
                    }

                    Walk(entry);
                    continue;
                }

                if (NameRules.TryMatchFile(name, lookup, out var fileId))
                {
                    matches.Add(new SourceMatch(fileId, Relative(entry), entry, MatchKind.File));
                    matchedIds.Add(fileId);
                }
            }
        }

        string Relative(string fullPath) => Path.GetRelativePath(fullRoot, fullPath);
    }
}
