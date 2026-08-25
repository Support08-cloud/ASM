using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Processing;

public sealed class CopyOutcome
{
    public required bool Success { get; init; }
    public required string DestinationPath { get; init; }
    public long BytesCopied { get; init; }
    public string? Error { get; init; }
    public bool Cancelled { get; init; }
}

public sealed class FileCopyService
{
    private readonly IFileSystem _fileSystem;

    public FileCopyService(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public async Task<CopyOutcome> CopyAsync(
        string source,
        string destination,
        bool overwrite,
        int bufferSize,
        CancellationToken cancellationToken)
    {
        var tempPath = destination + ".dfr.tmp";
        try
        {
            if (!_fileSystem.FileExists(source))
            {
                return new CopyOutcome
                {
                    Success = false,
                    DestinationPath = destination,
                    Error = "Source file disappeared"
                };
            }

            var destDir = Path.GetDirectoryName(destination);
            if (!string.IsNullOrEmpty(destDir))
                _fileSystem.CreateDirectory(destDir);

            var bytes = 0L;
            await using (var input = _fileSystem.OpenRead(source))
            await using (var output = _fileSystem.OpenWrite(tempPath, overwrite: true))
            {
                var buffer = new byte[Math.Max(32 * 1024, bufferSize)];
                int read;
                while ((read = await input.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false)) > 0)
                {
                    await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
                    bytes += read;
                }

                await output.FlushAsync(cancellationToken).ConfigureAwait(false);
            }

            if (overwrite)
                _fileSystem.ReplaceFile(tempPath, destination);
            else
                _fileSystem.MoveFile(tempPath, destination, overwrite: false);

            return new CopyOutcome
            {
                Success = true,
                DestinationPath = destination,
                BytesCopied = bytes
            };
        }
        catch (OperationCanceledException)
        {
            TryDelete(tempPath);
            return new CopyOutcome
            {
                Success = false,
                DestinationPath = destination,
                Cancelled = true,
                Error = "Cancelled"
            };
        }
        catch (Exception ex)
        {
            TryDelete(tempPath);
            return new CopyOutcome
            {
                Success = false,
                DestinationPath = destination,
                Error = FileCopyService.Describe(ex)
            };
        }
    }

    private void TryDelete(string path)
    {
        try
        {
            if (_fileSystem.FileExists(path))
                _fileSystem.DeleteFile(path);
        }
        catch
        {
            // Best-effort cleanup of partial files.
        }
    }

    internal static string Describe(Exception ex) => ex switch
    {
        UnauthorizedAccessException => "Access denied",
        FileNotFoundException => "Source file disappeared",
        DirectoryNotFoundException => "Destination unavailable",
        PathTooLongException => "Invalid path",
        IOException io when io.Message.Contains("disk", StringComparison.OrdinalIgnoreCase) => "Disk full",
        IOException io when io.Message.Contains("being used", StringComparison.OrdinalIgnoreCase) => "File locked",
        IOException io => string.IsNullOrWhiteSpace(io.Message) ? "IOException" : io.Message,
        _ => ex.Message
    };
}
