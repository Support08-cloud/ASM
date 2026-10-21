namespace Vision360.BulkExtractor.Excel;

public sealed class NameIdFileReader
{
    private readonly ExcelNameIdReader _excel = new();
    private readonly HtmlNameIdReader _html = new();

    public ExcelImportResult ReadFile(string path)
    {
        var extension = Path.GetExtension(path);
        if (extension.Equals(".html", StringComparison.OrdinalIgnoreCase) || extension.Equals(".htm", StringComparison.OrdinalIgnoreCase))
        {
            return _html.ReadFile(path);
        }

        if (extension.Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return _excel.ReadFile(path);
        }

        throw new ExcelFormatException("Select an Excel workbook (.xlsx) or an HTML file (.html) with a NAME ID column.");
    }
}
