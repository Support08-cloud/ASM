using DiamondFileRouter.Core.IO;

namespace DiamondFileRouter.Core.Tests;

internal sealed class TempWorkspace : IDisposable
{
    public string Root { get; }
    public string Input { get; }
    public string Output { get; }
    public string Data { get; }

    public TempWorkspace()
    {
        Root = Path.Combine(Path.GetTempPath(), "dfr-" + Guid.NewGuid().ToString("N"));
        Input = Path.Combine(Root, "input");
        Output = Path.Combine(Root, "output");
        Data = Path.Combine(Root, "data");
        Directory.CreateDirectory(Input);
        Directory.CreateDirectory(Output);
        Directory.CreateDirectory(Data);
    }

    public string CreateOutputStone(string stoneId)
    {
        var path = Path.Combine(Output, stoneId);
        Directory.CreateDirectory(path);
        return path;
    }

    public string WriteInputFile(string relativePath, string contents = "content")
    {
        var path = Path.Combine(Input, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, contents);
        return path;
    }

    public string WriteInputBinary(string relativePath, int bytes)
    {
        var path = Path.Combine(Input, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, Enumerable.Range(0, bytes).Select(i => (byte)(i % 256)).ToArray());
        return path;
    }

    public void Dispose()
    {
        try { Directory.Delete(Root, recursive: true); }
        catch { /* best effort */ }
    }
}

internal sealed class FaultingFileSystem : IFileSystem
{
    private readonly PhysicalFileSystem _inner = new();
    public HashSet<string> AccessDenied { get; } = new(StringComparer.OrdinalIgnoreCase);
    public HashSet<string> DisappearOnRead { get; } = new(StringComparer.OrdinalIgnoreCase);

    private void ThrowIfDenied(string path)
    {
        if (AccessDenied.Contains(path) || AccessDenied.Contains(Path.GetFileName(path)))
            throw new UnauthorizedAccessException("Access denied");
    }

    public bool FileExists(string path) => _inner.FileExists(path);
    public bool DirectoryExists(string path) => _inner.DirectoryExists(path);
    public IEnumerable<string> EnumerateFiles(string directory, bool recursive) => _inner.EnumerateFiles(directory, recursive);
    public IEnumerable<string> EnumerateDirectories(string directory, bool recursive = false) => _inner.EnumerateDirectories(directory, recursive);
    public long GetFileLength(string path) => _inner.GetFileLength(path);

    public Stream OpenRead(string path)
    {
        ThrowIfDenied(path);
        if (DisappearOnRead.Contains(path) || DisappearOnRead.Contains(Path.GetFileName(path)))
            throw new FileNotFoundException("Source file disappeared", path);
        return _inner.OpenRead(path);
    }

    public Stream OpenWrite(string path, bool overwrite)
    {
        ThrowIfDenied(path);
        return _inner.OpenWrite(path, overwrite);
    }

    public void CreateDirectory(string path) => _inner.CreateDirectory(path);
    public void DeleteFile(string path) => _inner.DeleteFile(path);
    public void MoveFile(string source, string destination, bool overwrite) => _inner.MoveFile(source, destination, overwrite);
    public void ReplaceFile(string source, string destination) => _inner.ReplaceFile(source, destination);
    public FileAttributes GetAttributes(string path) => _inner.GetAttributes(path);
}
