using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Matching;

public sealed class StoneMatch
{
    public required bool IsMatched { get; init; }
    public string? StoneId { get; init; }
    public string? DestinationFolder { get; init; }
    public MatchMethod Method { get; init; }
    public string? RelativePathWithinStone { get; init; }
    public string Reason { get; init; } = string.Empty;
}

public interface IStoneIdResolver
{
    StoneMatch Resolve(ScannedItem item, DestinationIndex index);
}

public sealed class StoneIdResolver : IStoneIdResolver
{
    private static readonly char[] SuffixSeparators = { '_', ' ', '(', '[', '{' };

    public StoneMatch Resolve(ScannedItem item, DestinationIndex index)
    {
        var fileNameNoExt = Path.GetFileNameWithoutExtension(item.Name);

        if (!string.IsNullOrWhiteSpace(fileNameNoExt) && index.TryGet(fileNameNoExt, out var exactDest))
        {
            return Matched(fileNameNoExt, exactDest, MatchMethod.ExactFolderName, item.Name);
        }

        var prefix = FindLongestPrefixMatch(fileNameNoExt, index);
        if (prefix is not null)
        {
            return Matched(prefix.Value.StoneId, prefix.Value.Destination, MatchMethod.FilenamePrefix, item.Name);
        }

        foreach (var ancestor in item.AncestorDirectoryNames)
        {
            if (index.TryGet(ancestor, out var parentDest))
            {
                var relative = BuildRelativeFromAncestor(item.FullPath, item.AncestorDirectoryPaths, ancestor);
                return Matched(ancestor, parentDest, MatchMethod.ParentFolderName, relative);
            }
        }

        if (item.IsDirectory && index.TryGet(item.Name, out var folderDest))
        {
            return Matched(item.Name, folderDest, MatchMethod.FolderName, string.Empty);
        }

        return new StoneMatch
        {
            IsMatched = false,
            StoneId = string.IsNullOrWhiteSpace(fileNameNoExt) ? item.Name : fileNameNoExt,
            Method = MatchMethod.None,
            Reason = "No matching Output folder found."
        };
    }

    private static (string StoneId, string Destination)? FindLongestPrefixMatch(string fileNameNoExt, DestinationIndex index)
    {
        if (string.IsNullOrWhiteSpace(fileNameNoExt))
            return null;

        string? bestId = null;
        string? bestDest = null;
        var ties = 0;

        foreach (var (stoneId, destination) in index.Folders)
        {
            if (!IsPrefixMatch(fileNameNoExt, stoneId))
                continue;

            if (bestId is null || stoneId.Length > bestId.Length)
            {
                bestId = stoneId;
                bestDest = destination;
                ties = 1;
            }
            else if (stoneId.Length == bestId.Length &&
                     !string.Equals(stoneId, bestId, StringComparison.OrdinalIgnoreCase))
            {
                ties++;
            }
        }

        if (bestId is null || bestDest is null || ties != 1)
            return null;

        return (bestId, bestDest);
    }

    internal static bool IsPrefixMatch(string fileNameNoExt, string stoneId)
    {
        if (!fileNameNoExt.StartsWith(stoneId, StringComparison.OrdinalIgnoreCase))
            return false;
        if (fileNameNoExt.Length == stoneId.Length)
            return false;
        var next = fileNameNoExt[stoneId.Length];
        return SuffixSeparators.Contains(next);
    }

    private static string BuildRelativeFromAncestor(
        string filePath,
        IReadOnlyDictionary<string, string> ancestorPaths,
        string ancestorName)
    {
        if (!ancestorPaths.TryGetValue(ancestorName, out var ancestorPath))
            return Path.GetFileName(filePath);

        var relative = Path.GetRelativePath(ancestorPath, filePath);
        return string.IsNullOrWhiteSpace(relative) ? Path.GetFileName(filePath) : relative;
    }

    private static StoneMatch Matched(string stoneId, string destination, MatchMethod method, string relative) =>
        new()
        {
            IsMatched = true,
            StoneId = stoneId,
            DestinationFolder = destination,
            Method = method,
            RelativePathWithinStone = relative,
            Reason = method switch
            {
                MatchMethod.ExactFolderName => "Exact filename without extension equals Output folder name.",
                MatchMethod.FilenamePrefix => "Filename begins with a matching Stone ID.",
                MatchMethod.ParentFolderName => "Parent folder matches an Output folder.",
                MatchMethod.FolderName => "Folder name matches an Output folder.",
                _ => "Matched."
            }
        };
}
