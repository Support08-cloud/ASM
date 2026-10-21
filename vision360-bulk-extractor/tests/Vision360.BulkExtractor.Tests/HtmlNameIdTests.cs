using Vision360.BulkExtractor.Excel;

namespace Vision360.BulkExtractor.Tests;

public class HtmlNameIdTests
{
    private readonly HtmlNameIdReader _reader = new();

    [Fact]
    public void ReadsANameIdTableAndKeepsLeadingZeros()
    {
        const string html = """
            <table>
              <tr><th>Name ID</th><th>Notes</th></tr>
              <tr><td> 00123 </td><td>keep</td></tr>
              <tr><td></td><td>blank</td></tr>
              <tr><td>00123</td><td>again</td></tr>
              <tr><td>10001</td><td>other</td></tr>
            </table>
            """;

        var result = _reader.Read(html, "ids.html");

        Assert.Equal(["00123", "10001"], result.Ids);
        Assert.Equal(1, result.DuplicateCount);
        Assert.Equal(1, result.EmptyRowCount);
    }

    [Fact]
    public void MissingHeaderExplainsThatNameIdIsRequired()
    {
        var error = Assert.Throws<ExcelFormatException>(() => _reader.Read("<table><tr><td>Stone</td></tr></table>", "bad.html"));

        Assert.Contains("NAME ID", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void FileReaderChoosesHtmlOrExcel()
    {
        var directory = Path.Combine(Path.GetTempPath(), "v360-html-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var htmlPath = Path.Combine(directory, "ids.html");
            File.WriteAllText(htmlPath, "<table><tr><th>NAME ID</th></tr><tr><td>77</td></tr></table>");
            var reader = new NameIdFileReader();

            var html = reader.ReadFile(htmlPath);
            Assert.Equal(["77"], html.Ids);

            var excelError = Assert.Throws<ExcelFormatException>(() => reader.ReadFile(Path.Combine(directory, "ids.csv")));
            Assert.Contains(".xlsx", excelError.Message, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
