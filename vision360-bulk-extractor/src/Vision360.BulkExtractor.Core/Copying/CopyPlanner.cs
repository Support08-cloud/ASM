using Vision360.BulkExtractor.Logging;
using Vision360.BulkExtractor.Matching;
using Vision360.BulkExtractor.Validation;

namespace Vision360.BulkExtractor.Copying;

public sealed class CopyPlanner
{
    public IReadOnlyList<PlannedMatch> Plan(
        string destinationRoot,
        IReadOnlyList<SourceMatch> matches,
        ExtractionLog? log)
    {
        var destination = Path.GetFullPath(destinationRoot);
        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var planned = new List<PlannedMatch>(matches.Count);

        foreach (var match in matches)
        {
            var leaf = LeafName(match.FullPath);
            if (leaf is null)
            {
                log?.Error($"Skipped an unsafe match path: {match.FullPath}");
                continue;
            }

            var candidate = Path.Combine(destination, leaf);
            if (!used.Add(Normalize(candidate)))
            {
                candidate = AlternateDestination(destination, leaf, match.RelativePath, used, log, match.FullPath);
            }

            if (!PathGuard.IsInsideOrEqual(destination, candidate))
            {
                log?.Error($"Skipped a match that would copy outside the destination: {match.FullPath}");
                continue;
            }

            planned.Add(new PlannedMatch(match.Id, Path.GetFullPath(match.FullPath), Path.GetFullPath(candidate), match.Kind));
        }

        return planned;
    }

    private static string AlternateDestination(
        string destination,
        string leaf,
        string relativePath,
        HashSet<string> used,
        ExtractionLog? log,
        string sourcePath)
    {
        var parent = Path.GetDirectoryName(relativePath);
        if (!string.IsNullOrEmpty(parent)
            && parent != "."
            && !parent.StartsWith("..", StringComparison.Ordinal)
            && !parent.Contains(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            && !parent.Contains(".." + Path.AltDirectorySeparatorChar, StringComparison.Ordinal))
        {
            var nested = Path.Combine(destination, parent, leaf);
            if (PathGuard.IsInsideOrEqual(destination, nested) && used.Add(Normalize(nested)))
            {
                log?.Info($"More than one item is named {leaf}. Copying {sourcePath} to {nested}.");
                return nested;
            }
        }

        var numbered = NextNumbered(destination, leaf, used);
        log?.Info($"More than one item is named {leaf}. Copying {sourcePath} to {numbered}.");
        return numbered;
    }

    private static string NextNumbered(string destination, string leaf, HashSet<string> used)
    {
        for (var number = 2; number < 10_000; number++)
        {
            var candidate = Path.Combine(destination, $"{leaf} ({number})");
            if (used.Add(Normalize(candidate)))
            {
                return candidate;
            }
        }

        throw new IOException($"Could not find a free destination name for {leaf}.");
    }

    private static string? LeafName(string fullPath)
    {
        var trimmed = fullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var leaf = Path.GetFileName(trimmed);
        return leaf is "." or ".." or "" ? null : leaf;
    }

    private static string Normalize(string path) => PathGuard.Normalize(path);
}
