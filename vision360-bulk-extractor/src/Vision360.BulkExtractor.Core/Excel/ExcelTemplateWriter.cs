using ClosedXML.Excel;

namespace Vision360.BulkExtractor.Excel;

public sealed class ExcelTemplateWriter
{
    public void Write(Stream stream)
    {
        ArgumentNullException.ThrowIfNull(stream);

        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("IDs");
        sheet.Cell(1, 1).Value = ExcelNameIdReader.ColumnHeader;
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Column(1).Style.NumberFormat.Format = "@";
        sheet.Cell(2, 1).Value = "10001";
        sheet.Cell(3, 1).Value = "10002";
        sheet.Cell(4, 1).Value = "10003";
        sheet.Column(1).Width = 24;
        sheet.SheetView.FreezeRows(1);
        workbook.SaveAs(stream);
    }

    public void WriteFile(string path)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        using var stream = File.Create(path);
        Write(stream);
    }
}
