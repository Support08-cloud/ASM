using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Scanning;

public interface IFileScanner
{
    ScanResult Scan(IReadOnlyList<string> inputs, bool recursive, CancellationToken cancellationToken = default);
}

public sealed class FileScanner : IFileScanner
{
    private readonly IFileSystem _fileSystem;

    public FileScanner(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public ScanResult Scan(IReadOnlyList<string> inputs, bool recursive, CancellationToken cancellationToken = default)
    {
        var items = new List<ScannedItem>();
        var errors = new List<ScanError>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var raw in inputs)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string path;
            try
            {
                path = PathNormalizer.Normalize(raw);
            }
            catch (Exception ex)
            {
                errors.Add(new ScanError { Path = raw, Message = ex.Message });
                continue;
            }

            try
            {
                if (_fileSystem.FileExists(path))
                {
                    AddFile(path, path, items, seen);
                }
                else if (_fileSystem.DirectoryExists(path))
                {
                    EnumerateDirectory(path, path, recursive, items, errors, seen, cancellationToken);
                }
                else
                {
                    errors.Add(new ScanError { Path = path, Message = "Input path does not exist." });
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                errors.Add(new ScanError { Path = path, Message = Describe(ex) });
            }
        }

        return new ScanResult { Items = items, Errors = errors };
    }

    private void EnumerateDirectory(
        string directory,
        string scanRoot,
        bool recursive,
        List<ScannedItem> items,
        List<ScanError> errors,
        HashSet<string> seen,
        CancellationToken cancellationToken)
    {
        IEnumerable<string> files;
        try
        {
            files = _fileSystem.EnumerateFiles(directory, recursive);
        }
        catch (Exception ex)
        {
            errors.Add(new ScanError { Path = directory, Message = Describe(ex) });
            return;
        }

        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                AddFile(file, scanRoot, items, seen);
            }
            catch (Exception ex)
            {
                errors.Add(new ScanError { Path = file, Message = Describe(ex) });
            }
        }
    }

    private void AddFile(string file, string scanRoot, List<ScannedItem> items, HashSet<string> seen)
    {
        var normalized = PathNormalizer.Normalize(file);
        if (normalized.EndsWith(".dfr.tmp", StringComparison.OrdinalIgnoreCase))
            return;
        if (!seen.Add(normalized))
            return;

        var name = Path.GetFileName(normalized);
        var parent = Path.GetDirectoryName(normalized) ?? string.Empty;
        var (ancestors, ancestorPaths) = BuildAncestors(normalized, scanRoot);

        long size = 0;
        try { size = _fileSystem.GetFileLength(normalized); }
        catch { /* length is informational */ }

        items.Add(new ScannedItem
        {
            FullPath = normalized,
            Name = name,
            Extension = Path.GetExtension(name),
            ParentFolder = parent,
            ParentFolderName = Path.GetFileName(PathNormalizer.TrimDirectorySeparators(parent)),
            IsDirectory = false,
            FileSizeBytes = size,
            AncestorDirectoryNames = ancestors,
            AncestorDirectoryPaths = ancestorPaths
        });
    }

    private static (IReadOnlyList<string> Names, IReadOnlyDictionary<string, string> Paths) BuildAncestors(
        string filePath,
        string scanRoot)
    {
        var names = new List<string>();
        var paths = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var root = PathNormalizer.Normalize(scanRoot);
        var rootDir = File.Exists(root) ? Path.GetDirectoryName(root) ?? root : root;
        var current = Path.GetDirectoryName(filePath);

        while (!string.IsNullOrEmpty(current))
        {
            var normalized = PathNormalizer.TrimDirectorySeparators(PathNormalizer.Normalize(current));
            var name = Path.GetFileName(normalized);
            if (!string.IsNullOrEmpty(name))
            {
                names.Add(name);
                paths.TryAdd(name, normalized);
            }

            if (PathNormalizer.EqualsNormalized(normalized, rootDir))
                break;

            var parent = Path.GetDirectoryName(normalized);
            if (string.IsNullOrEmpty(parent) || PathNormalizer.EqualsNormalized(parent, normalized))
                break;
            current = parent;
        }

        return (names, paths);
    }

    internal static string Describe(Exception ex) => ex switch
    {
        UnauthorizedAccessException => "Access denied",
        FileNotFoundException => "Source file disappeared",
        DirectoryNotFoundException => "Invalid path",
        PathTooLongException => "Invalid path",
        IOException io => string.IsNullOrWhiteSpace(io.Message) ? "IOException" : io.Message,
        _ => ex.Message
    };
}
