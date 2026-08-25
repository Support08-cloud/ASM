namespace DiamondFileRouter.Core.IO;

public sealed class PhysicalFileSystem : IFileSystem
{
    public bool FileExists(string path) => File.Exists(PathNormalizer.EnsureLongPath(path));

    public bool DirectoryExists(string path) => Directory.Exists(PathNormalizer.EnsureLongPath(path));

    public IEnumerable<string> EnumerateFiles(string directory, bool recursive)
    {
        var root = PathNormalizer.EnsureLongPath(directory);
        var option = recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
        foreach (var file in Directory.EnumerateFiles(root, "*", option))
            yield return PathNormalizer.StripLongPathPrefix(file);
    }

    public IEnumerable<string> EnumerateDirectories(string directory, bool recursive = false)
    {
        var root = PathNormalizer.EnsureLongPath(directory);
        var option = recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
        foreach (var dir in Directory.EnumerateDirectories(root, "*", option))
            yield return PathNormalizer.StripLongPathPrefix(dir);
    }

    public long GetFileLength(string path) => new FileInfo(PathNormalizer.EnsureLongPath(path)).Length;

    public Stream OpenRead(string path) =>
        new FileStream(PathNormalizer.EnsureLongPath(path), FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 64, FileOptions.SequentialScan);

    public Stream OpenWrite(string path, bool overwrite)
    {
        var full = PathNormalizer.EnsureLongPath(path);
        var dir = Path.GetDirectoryName(full);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        var mode = overwrite ? FileMode.Create : FileMode.CreateNew;
        return new FileStream(full, mode, FileAccess.Write, FileShare.None, 1024 * 64, FileOptions.SequentialScan);
    }

    public void CreateDirectory(string path) => Directory.CreateDirectory(PathNormalizer.EnsureLongPath(path));

    public void DeleteFile(string path) => File.Delete(PathNormalizer.EnsureLongPath(path));

    public void MoveFile(string source, string destination, bool overwrite)
    {
        var src = PathNormalizer.EnsureLongPath(source);
        var dest = PathNormalizer.EnsureLongPath(destination);
        var dir = Path.GetDirectoryName(dest);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        File.Move(src, dest, overwrite);
    }

    public void ReplaceFile(string source, string destination)
    {
        var src = PathNormalizer.EnsureLongPath(source);
        var dest = PathNormalizer.EnsureLongPath(destination);
        if (File.Exists(dest))
            File.Delete(dest);
        File.Move(src, dest);
    }

    public FileAttributes GetAttributes(string path) => File.GetAttributes(PathNormalizer.EnsureLongPath(path));
}
