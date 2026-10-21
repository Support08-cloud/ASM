using ClosedXML.Excel;
using Vision360.BulkExtractor.Excel;

namespace Vision360.BulkExtractor.Tests;

public class ExcelTests
{
    private readonly ExcelTemplateWriter _writer = new();
    private readonly ExcelNameIdReader _reader = new();

    [Fact]
    public void TemplateHasOnlyTheNameIdColumnAndSampleRows()
    {
        using var stream = new MemoryStream();
        _writer.Write(stream);
        stream.Position = 0;

        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheet(1);
        Assert.Equal(1, sheet.LastColumnUsed()!.ColumnNumber());
        Assert.Equal(ExcelNameIdReader.ColumnHeader, sheet.Cell(1, 1).GetString());
        Assert.Equal("10001", sheet.Cell(2, 1).GetString());
        Assert.Equal("10002", sheet.Cell(3, 1).GetString());
        Assert.Equal("10003", sheet.Cell(4, 1).GetString());
        Assert.Equal(XLDataType.Text, sheet.Cell(2, 1).Value.Type);
        Assert.Equal("@", sheet.Column(1).Style.NumberFormat.Format);
    }

    [Fact]
    public void TemplateRoundTripKeepsSampleIds()
    {
        using var stream = new MemoryStream();
        _writer.Write(stream);
        stream.Position = 0;

        var result = _reader.Read(stream, "NAME-ID-template.xlsx");

        Assert.Equal(["10001", "10002", "10003"], result.Ids);
        Assert.Equal(0, result.DuplicateCount);
        Assert.Equal(0, result.EmptyRowCount);
        Assert.Null(result.Warning);
    }

    [Fact]
    public void ReaderTrimsSpacesIgnoresEmptyRowsAndKeepsLeadingZeros()
    {
        using var stream = Workbook(sheet =>
        {
            sheet.Cell(1, 1).Value = "NAME ID";
            sheet.Cell(2, 1).Value = "  00123  ";
            sheet.Cell(3, 1).Value = "   ";
            sheet.Cell(4, 1).Value = "10001";
            sheet.Cell(5, 1).Value = "";
            sheet.Cell(6, 1).Value = "00123";
            sheet.Cell(7, 2).Value = "ignored note";
        });

        var result = _reader.Read(stream, "ids.xlsx");

        Assert.Equal(["00123", "10001"], result.Ids);
        Assert.Equal(1, result.DuplicateCount);
        Assert.Equal(3, result.EmptyRowCount);
    }

    [Fact]
    public void ReaderTreatsCaseInsensitiveRepeatsAsDuplicatesAndKeepsTheFirstSpelling()
    {
        using var stream = Workbook(sheet =>
        {
            sheet.Cell(1, 1).Value = "NAME ID";
            sheet.Cell(2, 1).Value = "AbC";
            sheet.Cell(3, 1).Value = "abc";
            sheet.Cell(4, 1).Value = "001";
            sheet.Cell(5, 1).Value = "1";
        });

        var result = _reader.Read(stream, "ids.xlsx");

        Assert.Equal(["AbC", "001", "1"], result.Ids);
        Assert.Equal(1, result.DuplicateCount);
    }

    [Fact]
    public void ReaderReadsIntegralNumbersWithoutLosingTheDigits()
    {
        using var stream = Workbook(sheet =>
        {
            sheet.Cell(1, 1).Value = "NAME ID";
            sheet.Cell(2, 1).Value = 10001;
            sheet.Cell(3, 1).Value = "00050";
        });

        var result = _reader.Read(stream, "ids.xlsx");

        Assert.Equal(["10001", "00050"], result.Ids);
    }

    [Fact]
    public void ReaderIgnoresColumnsOtherThanNameId()
    {
        using var stream = Workbook(sheet =>
        {
            sheet.Cell(1, 1).Value = "Notes";
            sheet.Cell(1, 2).Value = "NAME ID";
            sheet.Cell(2, 1).Value = "do not import";
            sheet.Cell(2, 2).Value = "42";
        });

        var result = _reader.Read(stream, "ids.xlsx");

        Assert.Equal(["42"], result.Ids);
    }

    [Fact]
    public void HeaderMatchIgnoresCaseAndATitleRowAboveIt()
    {
        using var stream = Workbook(sheet =>
        {
            sheet.Cell(1, 1).Value = "Diamond list";
            sheet.Cell(3, 1).Value = "Name ID";
            sheet.Cell(4, 1).Value = "10001";
        });

        var result = _reader.Read(stream, "ids.xlsx");

        Assert.Equal(["10001"], result.Ids);
    }

    [Fact]
    public void MissingColumnExplainsThatNameIdIsRequired()
    {
        using var stream = Workbook(sheet => sheet.Cell(1, 1).Value = "Stone ID");

        var error = Assert.Throws<ExcelFormatException>(() => _reader.Read(stream, "bad.xlsx"));

        Assert.Contains("NAME ID", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void EmptySheetExplainsThatTheHeaderIsRequired()
    {
        using var stream = Workbook(_ => { });

        var error = Assert.Throws<ExcelFormatException>(() => _reader.Read(stream, "empty.xlsx"));

        Assert.Contains("NAME ID", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void HeaderOnlyWorkbookWarnsThatNoIdsWereFound()
    {
        using var stream = Workbook(sheet => sheet.Cell(1, 1).Value = "NAME ID");

        var result = _reader.Read(stream, "header.xlsx");

        Assert.Empty(result.Ids);
        Assert.NotNull(result.Warning);
    }

    [Fact]
    public void ThousandsOfIdsAreImportedWithoutAFixedCap()
    {
        using var stream = Workbook(sheet =>
        {
            sheet.Cell(1, 1).Value = "NAME ID";
            for (var index = 0; index < 3000; index++)
            {
                sheet.Cell(index + 2, 1).Value = index.ToString("D6");
            }
        });

        var result = _reader.Read(stream, "many.xlsx");

        Assert.Equal(3000, result.Ids.Count);
        Assert.Equal("000000", result.Ids[0]);
        Assert.Equal("002999", result.Ids[^1]);
    }

    private static MemoryStream Workbook(Action<IXLWorksheet> fill)
    {
        var stream = new MemoryStream();
        using (var workbook = new XLWorkbook())
        {
            var sheet = workbook.AddWorksheet("IDs");
            fill(sheet);
            workbook.SaveAs(stream);
        }

        stream.Position = 0;
        return stream;
    }

}
