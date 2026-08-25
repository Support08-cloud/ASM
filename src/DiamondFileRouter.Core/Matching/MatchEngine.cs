using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.Matching;

public interface IMatchEngine
{
    ProcessingPlan BuildPlan(
        IReadOnlyList<string> inputPaths,
        string outputPath,
        ScanResult scan,
        DestinationIndex index,
        PathValidationResult validation);
}

public sealed class MatchEngine : IMatchEngine
{
    private readonly IStoneIdResolver _resolver;
    private readonly IFileSystem _fileSystem;

    public MatchEngine(IStoneIdResolver resolver, IFileSystem fileSystem)
    {
        _resolver = resolver;
        _fileSystem = fileSystem;
    }

    public ProcessingPlan BuildPlan(
        IReadOnlyList<string> inputPaths,
        string outputPath,
        ScanResult scan,
        DestinationIndex index,
        PathValidationResult validation)
    {
        var items = new List<ProcessingPlanItem>(scan.Items.Count);
        foreach (var scanned in scan.Items)
        {
            var match = _resolver.Resolve(scanned, index);
            var relative = string.IsNullOrWhiteSpace(match.RelativePathWithinStone)
                ? scanned.Name
                : match.RelativePathWithinStone.Replace('/', Path.DirectorySeparatorChar);

            string? destinationFile = null;
            var existed = false;
            if (match.IsMatched && !string.IsNullOrWhiteSpace(match.DestinationFolder))
            {
                destinationFile = Path.GetFullPath(Path.Combine(match.DestinationFolder, relative));
                existed = _fileSystem.FileExists(destinationFile);
            }

            var item = new ProcessingPlanItem
            {
                SourcePath = scanned.FullPath,
                SourceFileName = scanned.Name,
                SourceExtension = scanned.Extension,
                ParentFolder = scanned.ParentFolder,
                FileSizeBytes = scanned.FileSizeBytes,
                StoneId = match.StoneId,
                DestinationFolder = match.DestinationFolder,
                DestinationFilePath = destinationFile,
                MatchMethod = match.Method,
                RelativePathWithinStone = relative,
                DestinationExistedAtAnalysis = existed,
                Status = match.IsMatched
                    ? (existed ? ItemStatus.AlreadyExists : ItemStatus.Matched)
                    : ItemStatus.Unmatched,
                DuplicateStatus = existed ? DuplicateStatus.AlreadyExists : DuplicateStatus.None,
                Reason = existed && match.IsMatched
                    ? "Destination already contains a file with the same name."
                    : match.Reason
            };

            items.Add(item);
        }

        foreach (var error in scan.Errors)
        {
            items.Add(new ProcessingPlanItem
            {
                SourcePath = error.Path,
                SourceFileName = Path.GetFileName(error.Path),
                SourceExtension = Path.GetExtension(error.Path),
                ParentFolder = Path.GetDirectoryName(error.Path) ?? string.Empty,
                Status = ItemStatus.Error,
                ErrorInformation = error.Message,
                Reason = error.Message
            });
        }

        return new ProcessingPlan
        {
            InputPath = inputPaths.FirstOrDefault() ?? string.Empty,
            InputPaths = inputPaths,
            OutputPath = outputPath,
            Items = items,
            DestinationIndex = index,
            CreatedAt = DateTimeOffset.Now,
            ScanErrors = scan.Errors,
            Validation = validation
        };
    }
}
