using Vision360.BulkExtractor.Matching;

namespace Vision360.BulkExtractor.Tests;

public class SourceMatcherTests
{
    [Fact]
    public void FindsTopLevelFoldersAndIgnoresUnlistedOnes()
    {
        using var source = new TempDirectory();
        source.AddFolder("10001", "a.txt", "front");
        source.AddFolder("10002", "b.txt", "side");
        source.AddFolder("10003", "c.txt", "top");
        source.AddFolder("99999", "nope.txt", "leave");

        var result = new SourceMatcher().Scan(source.Path, ["10001", "10003"], null, CancellationToken.None);

        Assert.Equal(["10001", "10003"], result.Matches.Select(match => match.Id).OrderBy(id => id, StringComparer.Ordinal));
        Assert.Empty(result.MissingIds);
        Assert.DoesNotContain(result.Matches, match => match.Id == "10002");
        Assert.All(result.Matches, match => Assert.Equal(MatchKind.Folder, match.Kind));
        Assert.DoesNotContain(result.Matches, match => match.FullPath.Contains("99999", StringComparison.Ordinal));
    }

    [Fact]
    public void FindsNestedFoldersAndFilesWithoutTheExtension()
    {
        using var source = new TempDirectory();
        File.WriteAllText(source.Create("batch/deep/10003/clip.txt"), "nested");
        File.WriteAllText(source.Create("media/10005.mp4"), "video");
        File.WriteAllText(source.Create("media/10005.extra.mp4"), "not-this");
        File.WriteAllText(source.Create("media/readme.txt"), "notes");
        Directory.CreateDirectory(source.Create("1000"));

        var result = new SourceMatcher().Scan(source.Path, ["10003", "10005", "1000"], null, CancellationToken.None);

        Assert.Contains(result.Matches, match => match.Id == "10003" && match.Kind == MatchKind.Folder);
        Assert.Contains(result.Matches, match => match.Id == "10005" && match.Kind == MatchKind.File && match.FullPath.EndsWith("10005.mp4", StringComparison.Ordinal));
        Assert.DoesNotContain(result.Matches, match => match.FullPath.EndsWith("10005.extra.mp4", StringComparison.Ordinal));
        Assert.DoesNotContain(result.Matches, match => match.FullPath.EndsWith("readme.txt", StringComparison.Ordinal));
        Assert.Contains(result.Matches, match => match.Id == "1000" && match.Kind == MatchKind.Folder);
        Assert.Empty(result.MissingIds);
    }

    [Fact]
    public void MatchesLeadingZerosAndIgnoresCase()
    {
        using var source = new TempDirectory();
        source.AddFolder("00123", "stone.txt", "keep");
        source.AddFolder("AbC", "view.txt", "angle");

        var result = new SourceMatcher().Scan(source.Path, ["00123", "abc", "123"], null, CancellationToken.None);

        Assert.Contains(result.Matches, match => match.Id == "00123");
        Assert.Contains(result.Matches, match => match.Id == "abc" && match.FullPath.EndsWith("AbC", StringComparison.Ordinal));
        Assert.Equal(["123"], result.MissingIds);
    }

    [Fact]
    public void MatchesAFileWhoseWholeNameIsTheId()
    {
        using var source = new TempDirectory();
        File.WriteAllText(source.Create("pack/10001.xlsx"), "sheet");

        var result = new SourceMatcher().Scan(source.Path, ["10001.xlsx"], null, CancellationToken.None);

        var match = Assert.Single(result.Matches);
        Assert.Equal(MatchKind.File, match.Kind);
        Assert.EndsWith("10001.xlsx", match.FullPath, StringComparison.Ordinal);
    }

    [Fact]
    public void DoesNotTreatTheSourceRootItselfAsAMatch()
    {
        using var parent = new TempDirectory();
        var source = Path.Combine(parent.Path, "10001");
        Directory.CreateDirectory(source);
        File.WriteAllText(Path.Combine(source, "inside.txt"), "inside");

        var result = new SourceMatcher().Scan(source, ["10001"], null, CancellationToken.None);

        Assert.Empty(result.Matches);
        Assert.Equal(["10001"], result.MissingIds);
    }
}
