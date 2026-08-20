namespace DiamondFileRouter.Core.Models;

public sealed class ScannedItem
{
    public required string FullPath { get; init; }
    public required string Name { get; init; }
    public required string Extension { get; init; }
    public required string ParentFolder { get; init; }
    public required string ParentFolderName { get; init; }
    public required bool IsDirectory { get; init; }
    public long FileSizeBytes { get; init; }
    public IReadOnlyList<string> AncestorDirectoryNames { get; init; } = Array.Empty<string>();
    public IReadOnlyDictionary<string, string> AncestorDirectoryPaths { get; init; } =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
}

public sealed class ScanError
{
    public required string Path { get; init; }
    public required string Message { get; init; }
}

public sealed class ScanResult
{
    public required IReadOnlyList<ScannedItem> Items { get; init; }
    public required IReadOnlyList<ScanError> Errors { get; init; }
    public int FileCount => Items.Count;
}
