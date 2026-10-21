using System.Security.Cryptography;
using Vision360.BulkExtractor.Copying;
using Vision360.BulkExtractor.Logging;
using Vision360.BulkExtractor.Matching;
using Vision360.BulkExtractor.Validation;

namespace Vision360.BulkExtractor.Tests;

public class CopyAndValidationTests
{
    [Fact]
    public async Task CopiesAFolderToTheDestinationUnderItsOwnName()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        var payload = source.Create("DiamondData/10001/sub/a.txt");
        File.WriteAllText(payload, "diamond-a");
        File.WriteAllText(source.Create("DiamondData/10001/b.txt"), "diamond-b");
        File.WriteAllText(source.Create("DiamondData/10002/c.txt"), "leave-me");
        var before = Sha256(payload);
        var writtenAt = File.GetLastWriteTimeUtc(payload);

        var scan = new SourceMatcher().Scan(source.Path, ["10001", "10003"], null, CancellationToken.None);
        var summary = await new BulkCopyEngine().CopyAsync(
            destination.Path,
            ["10001", "10003"],
            scan.Matches,
            scan.MissingIds,
            ConflictPolicy.SkipExisting,
            new ExtractionLog(),
            null,
            CancellationToken.None);

        Assert.Equal("diamond-a", File.ReadAllText(Path.Combine(destination.Path, "10001", "sub", "a.txt")));
        Assert.Equal("diamond-b", File.ReadAllText(Path.Combine(destination.Path, "10001", "b.txt")));
        Assert.False(Directory.Exists(Path.Combine(destination.Path, "10002")));
        Assert.False(File.Exists(Path.Combine(destination.Path, "DiamondData", "10001", "b.txt")));
        Assert.Equal(before, Sha256(payload));
        Assert.Equal(writtenAt, File.GetLastWriteTimeUtc(payload));
        Assert.Equal(1, summary.SucceededIds);
        Assert.Equal(1, summary.MissingIds);
        Assert.Equal(["10003"], summary.MissingIdList);
        Assert.Equal(2, summary.FilesCopied);
        Assert.False(summary.NoMatches);
        Assert.Contains("10003", summary.FormatReport(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CopiesNestedMatchesAndSingleFilesWithoutTouchingUnrelatedFiles()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("batch/10001/inner/note.txt"), "note");
        File.WriteAllText(source.Create("batch/10001/10002/clip.mp4"), "clip");
        File.WriteAllText(source.Create("media/10005.mp4"), "video");
        File.WriteAllText(source.Create("media/10005.extra.mp4"), "unrelated");
        File.WriteAllText(source.Create("media/readme.txt"), "readme");

        var scan = new SourceMatcher().Scan(source.Path, ["10001", "10002", "10005"], null, CancellationToken.None);
        var summary = await CopyAsync(destination.Path, ["10001", "10002", "10005"], scan, ConflictPolicy.SkipExisting);

        Assert.Equal("note", File.ReadAllText(Path.Combine(destination.Path, "10001", "inner", "note.txt")));
        Assert.Equal("clip", File.ReadAllText(Path.Combine(destination.Path, "10001", "10002", "clip.mp4")));
        Assert.Equal("clip", File.ReadAllText(Path.Combine(destination.Path, "10002", "clip.mp4")));
        Assert.Equal("video", File.ReadAllText(Path.Combine(destination.Path, "10005.mp4")));
        Assert.False(File.Exists(Path.Combine(destination.Path, "10005.extra.mp4")));
        Assert.False(File.Exists(Path.Combine(destination.Path, "readme.txt")));
        Assert.Equal(3, summary.SucceededIds);
        Assert.Equal(0, summary.MissingIds);
    }

    [Fact]
    public async Task CreatesAnEmptyMatchedFolderAndAMissingDestinationRoot()
    {
        using var source = new TempDirectory();
        var destination = Path.Combine(source.Path, "out-does-not-exist-yet");
        var isolatedSource = Path.Combine(source.Path, "incoming");
        Directory.CreateDirectory(Path.Combine(isolatedSource, "10008"));

        var scan = new SourceMatcher().Scan(isolatedSource, ["10008"], null, CancellationToken.None);
        var summary = await CopyAsync(destination, ["10008"], scan, ConflictPolicy.SkipExisting);

        Assert.True(Directory.Exists(Path.Combine(destination, "10008")));
        Assert.Equal(1, summary.SucceededIds);
        Assert.Equal(0, summary.FilesCopied);
    }

    [Fact]
    public async Task SkipLeavesExistingDestinationBytesAndLogsTheSkip()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("10001/a.txt"), "new");
        Directory.CreateDirectory(Path.Combine(destination.Path, "10001"));
        File.WriteAllText(Path.Combine(destination.Path, "10001", "a.txt"), "old");

        var scan = new SourceMatcher().Scan(source.Path, ["10001"], null, CancellationToken.None);
        var log = new ExtractionLog();
        var summary = await new BulkCopyEngine().CopyAsync(
            destination.Path,
            ["10001"],
            scan.Matches,
            scan.MissingIds,
            ConflictPolicy.SkipExisting,
            log,
            null,
            CancellationToken.None);

        Assert.Equal("old", File.ReadAllText(Path.Combine(destination.Path, "10001", "a.txt")));
        Assert.Equal("new", File.ReadAllText(Path.Combine(source.Path, "10001", "a.txt")));
        Assert.Equal(0, summary.FilesCopied);
        Assert.Equal(1, summary.FilesSkipped);
        Assert.Equal(1, summary.SucceededIds);
        Assert.Contains("Skipped existing file", log.Text, StringComparison.Ordinal);
    }

    [Fact]
    public async Task OverwriteReplacesDestinationBytesOnlyWhenRequested()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("shot.mp4"), "fresh");
        File.WriteAllText(Path.Combine(destination.Path, "shot.mp4"), "stale");

        var scan = new SourceMatcher().Scan(source.Path, ["shot"], null, CancellationToken.None);
        var summary = await CopyAsync(destination.Path, ["shot"], scan, ConflictPolicy.Overwrite);

        Assert.Equal("fresh", File.ReadAllText(Path.Combine(destination.Path, "shot.mp4")));
        Assert.Equal("fresh", File.ReadAllText(Path.Combine(source.Path, "shot.mp4")));
        Assert.Equal(1, summary.FilesCopied);
        Assert.Equal(0, summary.FilesSkipped);
    }

    [Fact]
    public async Task SecondRunSkipsEverythingAlreadyCopied()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("10001/a.txt"), "a");
        File.WriteAllText(source.Create("10001/nested/b.txt"), "b");
        var scan = new SourceMatcher().Scan(source.Path, ["10001"], null, CancellationToken.None);

        var first = await CopyAsync(destination.Path, ["10001"], scan, ConflictPolicy.SkipExisting);
        var second = await CopyAsync(destination.Path, ["10001"], scan, ConflictPolicy.SkipExisting);

        Assert.Equal(2, first.FilesCopied);
        Assert.Equal(0, second.FilesCopied);
        Assert.Equal(2, second.FilesSkipped);
        Assert.Equal("a", File.ReadAllText(Path.Combine(source.Path, "10001", "a.txt")));
    }

    [Fact]
    public async Task DuplicateIdsInTheRequestAreCopiedOnce()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("10001/a.txt"), "once");
        var scan = new SourceMatcher().Scan(source.Path, ["10001"], null, CancellationToken.None);

        var summary = await new BulkCopyEngine().CopyAsync(
            destination.Path,
            ["10001", "10001", " 10001 "],
            scan.Matches,
            scan.MissingIds,
            ConflictPolicy.SkipExisting,
            new ExtractionLog(),
            null,
            CancellationToken.None);

        Assert.Equal(1, summary.FilesCopied);
        Assert.Equal(1, summary.TotalIds);
    }

    [Fact]
    public async Task AMissingFileDoesNotStopTheNextId()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        var gone = source.Create("10001.txt");
        File.WriteAllText(gone, "gone");
        File.WriteAllText(source.Create("10002/b.txt"), "kept");
        var scan = new SourceMatcher().Scan(source.Path, ["10001", "10002"], null, CancellationToken.None);
        File.Delete(gone);

        var summary = await CopyAsync(destination.Path, ["10001", "10002"], scan, ConflictPolicy.SkipExisting);

        Assert.Equal(1, summary.FailedIds);
        Assert.Equal(["10001"], summary.FailedIdList);
        Assert.Equal(1, summary.SucceededIds);
        Assert.Equal("kept", File.ReadAllText(Path.Combine(destination.Path, "10002", "b.txt")));
        Assert.Contains("Failed", summary.FormatReport(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task NoMatchesDoesNotReportASuccessfulExtraction()
    {
        using var destination = new TempDirectory();
        var summary = await new BulkCopyEngine().CopyAsync(
            destination.Path,
            ["404"],
            [],
            ["404"],
            ConflictPolicy.SkipExisting,
            new ExtractionLog(),
            null,
            CancellationToken.None);

        Assert.True(summary.NoMatches);
        Assert.Equal(0, summary.SucceededIds);
        Assert.Equal(0, summary.FilesCopied);
        Assert.Contains("Nothing was copied", summary.FormatReport(), StringComparison.Ordinal);
        Assert.Empty(Directory.EnumerateFileSystemEntries(destination.Path));
    }

    [Fact]
    public async Task StreamingCopyKeepsEveryByteOfAMultiMegabyteFile()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        var bytes = new byte[(1024 * 1024) + 128];
        RandomNumberGenerator.Fill(bytes);
        File.WriteAllBytes(source.Create("archive/50000.bin"), bytes);

        var scan = new SourceMatcher().Scan(source.Path, ["50000"], null, CancellationToken.None);
        var summary = await CopyAsync(destination.Path, ["50000"], scan, ConflictPolicy.SkipExisting);

        var copied = File.ReadAllBytes(Path.Combine(destination.Path, "50000.bin"));
        Assert.Equal(SHA256.HashData(bytes), SHA256.HashData(copied));
        Assert.Equal(bytes.Length, summary.BytesCopied);
    }

    [Fact]
    public async Task CancelDuringALargeFileLeavesNoPartialAndDoesNotChangeTheSource()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        var bytes = new byte[(2 * 1024 * 1024) + 32];
        RandomNumberGenerator.Fill(bytes);
        var sourceFile = source.Create("70001/movie.bin");
        File.WriteAllBytes(sourceFile, bytes);
        var hash = SHA256.HashData(bytes);
        var scan = new SourceMatcher().Scan(source.Path, ["70001"], null, CancellationToken.None);
        using var cts = new CancellationTokenSource();
        var progress = new SyncProgress<CopyProgress>(update =>
        {
            if (update.BytesCopied > 0)
            {
                cts.Cancel();
            }
        });

        var summary = await new BulkCopyEngine().CopyAsync(
            destination.Path,
            ["70001"],
            scan.Matches,
            scan.MissingIds,
            ConflictPolicy.SkipExisting,
            new ExtractionLog(),
            progress,
            cts.Token);

        Assert.True(summary.WasCancelled);
        Assert.Equal(0, summary.FilesCopied);
        Assert.Equal(hash, SHA256.HashData(File.ReadAllBytes(sourceFile)));
        Assert.False(File.Exists(Path.Combine(destination.Path, "70001", "movie.bin")));
        Assert.DoesNotContain(Directory.EnumerateFiles(destination.Path, "*", SearchOption.AllDirectories), path => path.Contains(".partial", StringComparison.Ordinal) || path.Contains(".v360-", StringComparison.Ordinal));
    }

    [Fact]
    public async Task CancelAfterTheFirstFileStopsTheRest()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("10001/a.txt"), "a");
        File.WriteAllText(source.Create("10001/b.txt"), "b");
        File.WriteAllText(source.Create("10001/c.txt"), "c");
        var scan = new SourceMatcher().Scan(source.Path, ["10001"], null, CancellationToken.None);
        using var cts = new CancellationTokenSource();
        var progress = new SyncProgress<CopyProgress>(update =>
        {
            if (update.FilesCopied >= 1)
            {
                cts.Cancel();
            }
        });

        var summary = await new BulkCopyEngine().CopyAsync(
            destination.Path,
            ["10001"],
            scan.Matches,
            scan.MissingIds,
            ConflictPolicy.SkipExisting,
            new ExtractionLog(),
            progress,
            cts.Token);

        Assert.True(summary.WasCancelled);
        Assert.Equal(1, summary.FilesCopied);
        Assert.Single(Directory.EnumerateFiles(Path.Combine(destination.Path, "10001")));
    }

    [Fact]
    public async Task TwoFoldersWithTheSameNameAreBothCopied()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        File.WriteAllText(source.Create("a/10001/file.txt"), "from-a");
        File.WriteAllText(source.Create("b/10001/file.txt"), "from-b");
        var scan = new SourceMatcher().Scan(source.Path, ["10001"], null, CancellationToken.None);

        var summary = await CopyAsync(destination.Path, ["10001"], scan, ConflictPolicy.SkipExisting);
        var copies = Directory.EnumerateFiles(destination.Path, "file.txt", SearchOption.AllDirectories)
            .Select(File.ReadAllText)
            .OrderBy(text => text, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(["from-a", "from-b"], copies);
        Assert.Equal(2, summary.FilesCopied);
    }

    [Fact]
    public async Task ALargerTreeIsCopiedWithoutAHardItemLimit()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        const int folders = 40;
        const int filesPerFolder = 15;
        var ids = new List<string>();
        for (var folder = 0; folder < folders; folder++)
        {
            var id = (10_000 + folder).ToString();
            ids.Add(id);
            for (var file = 0; file < filesPerFolder; file++)
            {
                File.WriteAllText(source.Create($"{id}/part-{file}.txt"), $"{id}-{file}");
            }
        }

        File.WriteAllText(source.Create("untouched/note.txt"), "stay");
        var scan = new SourceMatcher().Scan(source.Path, ids, null, CancellationToken.None);
        var summary = await CopyAsync(destination.Path, ids, scan, ConflictPolicy.SkipExisting);

        Assert.Equal(folders * filesPerFolder, summary.FilesCopied);
        Assert.Equal(folders, summary.SucceededIds);
        Assert.Equal("10000-0", File.ReadAllText(Path.Combine(destination.Path, "10000", "part-0.txt")));
        Assert.Equal("10039-14", File.ReadAllText(Path.Combine(destination.Path, "10039", "part-14.txt")));
        Assert.False(Directory.Exists(Path.Combine(destination.Path, "untouched")));
        Assert.Equal("stay", File.ReadAllText(Path.Combine(source.Path, "untouched", "note.txt")));
    }

    [Fact]
    public void OverlappingFoldersAreRejected()
    {
        using var root = new TempDirectory();
        var source = Path.Combine(root.Path, "source");
        var child = Path.Combine(source, "child");
        Directory.CreateDirectory(child);
        File.WriteAllText(Path.Combine(source, "10001.txt"), "id");

        Assert.False(Validate(source, source).CanStart);
        Assert.False(Validate(source, child).CanStart);
        Assert.False(Validate(child, source).CanStart);
        Assert.Contains("overlap", string.Join(" ", Validate(source, source + Path.DirectorySeparatorChar).Errors), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidationRequiresIdsAndRealFolders()
    {
        using var root = new TempDirectory();
        var source = Path.Combine(root.Path, "in");
        var destination = Path.Combine(root.Path, "out");
        Directory.CreateDirectory(source);

        var missingExcel = OperationValidator.Validate(new OperationInput(false, 0, source, destination));
        Assert.Contains(missingExcel.Errors, error => error.Contains("Excel", StringComparison.Ordinal));

        var missingIds = OperationValidator.Validate(new OperationInput(true, 0, source, destination));
        Assert.Contains(missingIds.Errors, error => error.Contains("NAME ID", StringComparison.Ordinal));

        var missingSource = OperationValidator.Validate(new OperationInput(true, 1, Path.Combine(root.Path, "nope"), destination));
        Assert.Contains(missingSource.Errors, error => error.Contains("source", StringComparison.OrdinalIgnoreCase));

        var created = OperationValidator.Validate(new OperationInput(true, 2, source, destination));
        Assert.True(created.CanStart);
        Assert.True(created.DestinationWillBeCreated);
        Assert.False(Directory.Exists(destination));
    }

    [Fact]
    public void FreeSpaceCheckBlocksOnlyWhenTheEstimateExceedsWhatIsKnown()
    {
        Assert.Null(OperationValidator.FreeSpaceError(10, null));
        Assert.Null(OperationValidator.FreeSpaceError(10, 10));
        Assert.Contains("Not enough free space", OperationValidator.FreeSpaceError(11, 10), StringComparison.Ordinal);
        Assert.True(OperationValidator.TryGetAvailableBytes(Path.GetTempPath()) > 0);
    }

    [Fact]
    public void EstimateCountsNewBytesAndSkipsFilesThatAlreadyExist()
    {
        using var source = new TempDirectory();
        using var destination = new TempDirectory();
        var body = new string('x', 128);
        File.WriteAllText(source.Create("10001/a.txt"), body);
        File.WriteAllText(source.Create("10001/b.txt"), body);
        var scan = new SourceMatcher().Scan(source.Path, ["10001"], null, CancellationToken.None);
        var plan = new CopyPlanner().Plan(destination.Path, scan.Matches, null);

        var first = CopySizeEstimator.Estimate(plan, ConflictPolicy.SkipExisting, CancellationToken.None);
        Directory.CreateDirectory(Path.Combine(destination.Path, "10001"));
        File.WriteAllText(Path.Combine(destination.Path, "10001", "a.txt"), "already");
        var second = CopySizeEstimator.Estimate(plan, ConflictPolicy.SkipExisting, CancellationToken.None);

        Assert.Equal(256, first);
        Assert.Equal(128, second);
    }

    private static ValidationResult Validate(string source, string destination) =>
        OperationValidator.Validate(new OperationInput(true, 1, source, destination));

    private static Task<CopySummary> CopyAsync(string destination, IReadOnlyList<string> ids, ScanResult scan, ConflictPolicy policy) =>
        new BulkCopyEngine().CopyAsync(
            destination,
            ids,
            scan.Matches,
            scan.MissingIds,
            policy,
            new ExtractionLog(),
            null,
            CancellationToken.None);

    private static string Sha256(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }
}
