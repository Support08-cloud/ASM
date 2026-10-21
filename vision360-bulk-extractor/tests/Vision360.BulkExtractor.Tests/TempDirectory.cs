namespace Vision360.BulkExtractor.Tests;

internal sealed class TempDirectory : IDisposable
{
    public TempDirectory()
    {
        Path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "v360-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path);
    }

    public string Path { get; }

    public string Create(string relativePath)
    {
        var full = System.IO.Path.Combine(Path, relativePath.Replace('/', System.IO.Path.DirectorySeparatorChar));
        var directory = System.IO.Path.GetDirectoryName(full);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        return full;
    }

    public void AddFolder(string name, string fileName, string contents)
    {
        File.WriteAllText(Create(System.IO.Path.Combine(name, fileName)), contents);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
        catch (IOException)
        {
        }
    }
}

internal sealed class SyncProgress<T> : IProgress<T>
{
    private readonly Action<T> _report;

    public SyncProgress(Action<T> report) => _report = report;

    public void Report(T value) => _report(value);
}
