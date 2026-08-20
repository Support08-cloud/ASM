using DiamondFileRouter.Core.DuplicateHandling;
using DiamondFileRouter.Core.Indexing;
using DiamondFileRouter.Core.IO;
using DiamondFileRouter.Core.Matching;
using DiamondFileRouter.Core.Models;
using DiamondFileRouter.Core.Scanning;

namespace DiamondFileRouter.Core.Tests;

public class MatchingTests
{
    private static ProcessingPlan Analyze(TempWorkspace ws, bool recursive = true, params string[] extraInputs)
    {
        var fs = new PhysicalFileSystem();
        var inputs = extraInputs.Length == 0 ? new[] { ws.Input } : extraInputs;
        var scan = new FileScanner(fs).Scan(inputs, recursive);
        var index = new OutputDirectoryIndexer(fs).Build(ws.Output);
        var validation = new PathSafetyValidator(fs).Validate(inputs, ws.Output);
        return new MatchEngine(new StoneIdResolver(), fs).BuildPlan(inputs, ws.Output, scan, index, validation);
    }

    [Fact]
    public void Exact_filename_without_extension_matches_output_folder()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E-2500600-15-30");
        ws.CreateOutputStone("E-2500600-15-31");
        ws.CreateOutputStone("E-2500600-15-32");
        ws.WriteInputFile("E-2500600-15-30.html");
        ws.WriteInputFile("E-2500600-15-31.jpg");
        ws.WriteInputFile("E-2500600-15-32.mp4");

        var plan = Analyze(ws);
        Assert.Equal(3, plan.MatchedCount);
        Assert.All(plan.Items, item =>
        {
            Assert.Equal(MatchMethod.ExactFolderName, item.MatchMethod);
            Assert.Equal(ItemStatus.Matched, item.Status);
            Assert.Equal(Path.Combine(ws.Output, item.StoneId!, item.SourceFileName), item.DestinationFilePath);
        });
    }

    [Fact]
    public void Simple_name_match_abc_xyz_lmn()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        ws.CreateOutputStone("xyz");
        ws.CreateOutputStone("lmn");
        ws.WriteInputFile("abc.html");
        ws.WriteInputFile("xyz.html");
        ws.WriteInputFile("lmn.html");
        ws.WriteInputFile("unknown.html");

        var plan = Analyze(ws);
        Assert.Equal(3, plan.MatchedCount);
        Assert.Equal(1, plan.UnmatchedCount);
        var unknown = plan.Items.Single(i => i.SourceFileName == "unknown.html");
        Assert.Equal(ItemStatus.Unmatched, unknown.Status);
        Assert.Equal("No matching Output folder found.", unknown.Reason);
        Assert.Null(unknown.DestinationFolder);
    }

    [Fact]
    public void Filename_prefix_match_uses_suffix_separator()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E-2500600-15-30");
        ws.WriteInputFile("E-2500600-15-30_preview.html");

        var plan = Analyze(ws);
        var item = Assert.Single(plan.Items);
        Assert.Equal(ItemStatus.Matched, item.Status);
        Assert.Equal(MatchMethod.FilenamePrefix, item.MatchMethod);
        Assert.Equal("E-2500600-15-30", item.StoneId);
    }

    [Fact]
    public void Prefix_does_not_guess_short_folder_names()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E");
        ws.WriteInputFile("E-2500600-15-30.html");

        var plan = Analyze(ws);
        var item = Assert.Single(plan.Items);
        Assert.Equal(ItemStatus.Unmatched, item.Status);
    }

    [Fact]
    public void Nested_parent_folder_match_preserves_relative_structure()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E-2500600-15-30");
        ws.WriteInputFile(Path.Combine("Batch01", "E-2500600-15-30", "sub", "0.json"), "{}");

        var plan = Analyze(ws);
        var item = Assert.Single(plan.Items);
        Assert.Equal(MatchMethod.ParentFolderName, item.MatchMethod);
        Assert.Equal("E-2500600-15-30", item.StoneId);
        Assert.Equal(Path.Combine(ws.Output, "E-2500600-15-30", "sub", "0.json"), item.DestinationFilePath);
    }

    [Fact]
    public void Complete_diamond_folder_contents_match_folder_name()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E-2500600-15-30");
        ws.WriteInputFile(Path.Combine("E-2500600-15-30", "0.json"));
        ws.WriteInputFile(Path.Combine("E-2500600-15-30", "sm.json"));
        ws.WriteInputFile(Path.Combine("E-2500600-15-30", "E-2500600-15-30.html"));

        var plan = Analyze(ws);
        Assert.Equal(3, plan.MatchedCount);
        var html = plan.Items.Single(i => i.SourceFileName == "E-2500600-15-30.html");
        Assert.Equal(MatchMethod.ExactFolderName, html.MatchMethod);
        var json = plan.Items.Single(i => i.SourceFileName == "0.json");
        Assert.Equal(MatchMethod.ParentFolderName, json.MatchMethod);
    }

    [Fact]
    public void Mixed_file_types_are_not_restricted()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        ws.WriteInputFile("abc.html");
        ws.WriteInputFile("abc.bin", "binary");
        ws.WriteInputFile("abc.unknown");

        var plan = Analyze(ws);
        Assert.Equal(3, plan.MatchedCount);
    }

    [Fact]
    public void Multiple_files_same_stone_id()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("stone-1");
        ws.WriteInputFile("stone-1.html");
        ws.WriteInputFile("stone-1.jpg");
        ws.WriteInputFile("stone-1.json");

        var plan = Analyze(ws);
        Assert.Equal(3, plan.MatchedCount);
        Assert.All(plan.Items, i => Assert.Equal("stone-1", i.StoneId));
    }

    [Fact]
    public void Spaces_and_special_characters_in_paths()
    {
        using var ws = new TempWorkspace();
        var stone = "Stone ID (A) & Co";
        ws.CreateOutputStone(stone);
        ws.WriteInputFile(Path.Combine("batch one", stone + ".html"), "x");

        var plan = Analyze(ws);
        var item = Assert.Single(plan.Items);
        Assert.Equal(ItemStatus.Matched, item.Status);
        Assert.Equal(stone, item.StoneId);
    }

    [Fact]
    public void Unicode_filenames()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("钻石-001");
        ws.WriteInputFile("钻石-001.html");

        var plan = Analyze(ws);
        Assert.Equal("钻石-001", Assert.Single(plan.Items).StoneId);
    }

    [Fact]
    public void Empty_input_yields_empty_plan()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        var plan = Analyze(ws);
        Assert.Empty(plan.Items);
    }

    [Fact]
    public void Empty_output_marks_everything_unmatched()
    {
        using var ws = new TempWorkspace();
        ws.WriteInputFile("abc.html");
        var plan = Analyze(ws);
        Assert.Equal(ItemStatus.Unmatched, Assert.Single(plan.Items).Status);
    }

    [Fact]
    public void Non_recursive_scan_ignores_nested_files()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("abc");
        ws.WriteInputFile("abc.html");
        ws.WriteInputFile(Path.Combine("nested", "abc.json"));

        var plan = Analyze(ws, recursive: false);
        Assert.Single(plan.Items);
        Assert.Equal("abc.html", plan.Items[0].SourceFileName);
    }

    [Fact]
    public void Longest_prefix_wins_among_output_folders()
    {
        using var ws = new TempWorkspace();
        ws.CreateOutputStone("E-2500600-15-30");
        ws.CreateOutputStone("E-2500600-15-30-A");
        ws.WriteInputFile("E-2500600-15-30-A_preview.html");

        var plan = Analyze(ws);
        Assert.Equal("E-2500600-15-30-A", Assert.Single(plan.Items).StoneId);
        Assert.Equal(MatchMethod.FilenamePrefix, plan.Items[0].MatchMethod);
    }
}
