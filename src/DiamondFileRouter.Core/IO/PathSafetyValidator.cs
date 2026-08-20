using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.Core.IO;

public sealed class PathSafetyValidator
{
    private readonly IFileSystem _fileSystem;

    public PathSafetyValidator(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public PathValidationResult Validate(IReadOnlyList<string> inputPaths, string? outputPath)
    {
        var result = new PathValidationResult();
        var normalizedInputs = new List<string>();

        if (inputPaths.Count == 0)
            result.Errors.Add("Select at least one input file or folder.");

        if (string.IsNullOrWhiteSpace(outputPath))
            result.Errors.Add("Select an Output directory.");

        foreach (var input in inputPaths.Where(p => !string.IsNullOrWhiteSpace(p)))
        {
            try
            {
                var normalized = PathNormalizer.Normalize(input);
                if (!_fileSystem.FileExists(normalized) && !_fileSystem.DirectoryExists(normalized))
                {
                    result.Errors.Add($"Input path does not exist: {normalized}");
                    continue;
                }

                normalizedInputs.Add(normalized);
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Invalid input path '{input}': {ex.Message}");
            }
        }

        string? normalizedOutput = null;
        if (!string.IsNullOrWhiteSpace(outputPath))
        {
            try
            {
                normalizedOutput = PathNormalizer.Normalize(outputPath);
                if (!_fileSystem.DirectoryExists(normalizedOutput))
                    result.Errors.Add($"Output directory does not exist: {normalizedOutput}");
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Invalid Output path: {ex.Message}");
            }
        }

        if (normalizedOutput is not null)
        {
            foreach (var input in normalizedInputs)
            {
                if (PathNormalizer.EqualsNormalized(input, normalizedOutput))
                {
                    result.Errors.Add("Input and Output cannot be the same directory.");
                    continue;
                }

                var inputDir = _fileSystem.FileExists(input)
                    ? Path.GetDirectoryName(input) ?? input
                    : input;

                if (PathNormalizer.EqualsNormalized(inputDir, normalizedOutput) && _fileSystem.FileExists(input))
                    result.Warnings.Add($"Input file is inside the Output directory: {input}");

                if (_fileSystem.DirectoryExists(input) && PathNormalizer.IsSameOrNested(normalizedOutput, input))
                    result.Errors.Add("Input is nested inside Output. This is unsafe and is not allowed.");

                if (_fileSystem.DirectoryExists(input) && PathNormalizer.IsSameOrNested(input, normalizedOutput))
                    result.Errors.Add("Output is nested inside Input. This is unsafe and is not allowed.");
            }
        }

        return new PathValidationResult
        {
            NormalizedInputPath = normalizedInputs.FirstOrDefault(),
            NormalizedOutputPath = normalizedOutput,
            NormalizedInputPaths = normalizedInputs
        }.Tap(clone =>
        {
            clone.Errors.AddRange(result.Errors);
            clone.Warnings.AddRange(result.Warnings);
        });
    }
}

file static class PathValidationResultExtensions
{
    public static PathValidationResult Tap(this PathValidationResult result, Action<PathValidationResult> action)
    {
        action(result);
        return result;
    }
}
