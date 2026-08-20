namespace DiamondFileRouter.Core.Models;

public sealed class PathValidationResult
{
    public bool IsValid => Errors.Count == 0;
    public List<string> Errors { get; } = new();
    public List<string> Warnings { get; } = new();
    public string? NormalizedInputPath { get; init; }
    public string? NormalizedOutputPath { get; init; }
    public IReadOnlyList<string> NormalizedInputPaths { get; init; } = Array.Empty<string>();
}
