using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.DuplicateHandling;

public sealed class DuplicateDecision
{
    public required DuplicateAction Action { get; init; }
    public required string DestinationPath { get; init; }
    public required DuplicateStatus Status { get; init; }
    public string? Reason { get; init; }
}

public interface IDuplicateHandler
{
    DuplicateDecision Resolve(string intendedDestination, DuplicateAction action);
}

public sealed class DuplicateHandler : IDuplicateHandler
{
    private readonly IFileSystem _fileSystem;

    public DuplicateHandler(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public DuplicateDecision Resolve(string intendedDestination, DuplicateAction action)
    {
        if (!_fileSystem.FileExists(intendedDestination))
        {
            return new DuplicateDecision
            {
                Action = action,
                DestinationPath = intendedDestination,
                Status = DuplicateStatus.None
            };
        }

        return action switch
        {
            DuplicateAction.Replace => new DuplicateDecision
            {
                Action = DuplicateAction.Replace,
                DestinationPath = intendedDestination,
                Status = DuplicateStatus.Replaced,
                Reason = "Destination file will be replaced."
            },
            DuplicateAction.Rename => new DuplicateDecision
            {
                Action = DuplicateAction.Rename,
                DestinationPath = NextAvailableName(intendedDestination),
                Status = DuplicateStatus.Renamed,
                Reason = "Destination file exists; a unique name will be used."
            },
            _ => new DuplicateDecision
            {
                Action = DuplicateAction.Skip,
                DestinationPath = intendedDestination,
                Status = DuplicateStatus.Skipped,
                Reason = "ALREADY EXISTS / SKIPPED"
            }
        };
    }

    internal string NextAvailableName(string intendedDestination)
    {
        var directory = Path.GetDirectoryName(intendedDestination) ?? string.Empty;
        var fileName = Path.GetFileNameWithoutExtension(intendedDestination);
        var extension = Path.GetExtension(intendedDestination);

        for (var i = 1; i < 10_000; i++)
        {
            var candidate = Path.Combine(directory, $"{fileName} ({i}){extension}");
            if (!_fileSystem.FileExists(candidate))
                return candidate;
        }

        return Path.Combine(directory, $"{fileName} ({Guid.NewGuid():N}){extension}");
    }
}
