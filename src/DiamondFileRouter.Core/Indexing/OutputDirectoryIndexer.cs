using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Indexing;

public interface IOutputDirectoryIndexer
{
    DestinationIndex Build(string outputDirectory, CancellationToken cancellationToken = default);
}

public sealed class OutputDirectoryIndexer : IOutputDirectoryIndexer
{
    private readonly IFileSystem _fileSystem;

    public OutputDirectoryIndexer(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public DestinationIndex Build(string outputDirectory, CancellationToken cancellationToken = default)
    {
        var root = PathNormalizer.Normalize(outputDirectory);
        if (!_fileSystem.DirectoryExists(root))
            throw new DirectoryNotFoundException($"Output directory does not exist: {root}");

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var directory in _fileSystem.EnumerateDirectories(root, recursive: false))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var name = Path.GetFileName(PathNormalizer.TrimDirectorySeparators(directory));
            if (string.IsNullOrWhiteSpace(name))
                continue;
            map[name] = PathNormalizer.Normalize(directory);
        }

        return new DestinationIndex(map) { RootPath = root };
    }
}
