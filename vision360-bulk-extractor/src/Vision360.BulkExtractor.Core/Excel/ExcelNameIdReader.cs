using System.Globalization;
using ClosedXML.Excel;

namespace Vision360.BulkExtractor.Excel;

public sealed class ExcelNameIdReader
{
    public const string ColumnHeader = "NAME ID";

    public ExcelImportResult Read(Stream stream, string fileName)
    {
        ArgumentNullException.ThrowIfNull(stream);
        if (!stream.CanSeek)
        {
            throw new ArgumentException("The Excel stream must be seekable.", nameof(stream));
        }

        XLWorkbook workbook;
        try
        {
            workbook = new XLWorkbook(stream);
        }
        catch (Exception exception) when (exception is not ExcelFormatException)
        {
            throw new ExcelFormatException(
                "Could not read this file as an .xlsx workbook. Download the template and save the list as .xlsx.");
        }

        using (workbook)
        {
            if (workbook.Worksheets.Count == 0)
            {
                throw new ExcelFormatException("The workbook has no worksheets. The first row must contain a NAME ID column.");
            }

            var sheet = workbook.Worksheet(1);
            var headerRow = sheet.FirstRowUsed();
            if (headerRow is null)
            {
                throw new ExcelFormatException("The worksheet is empty. The first row must contain a NAME ID column.");
            }

            var column = FindNameIdColumn(headerRow);
            if (column == 0)
            {
                throw new ExcelFormatException(
                    "The required column NAME ID is missing. Download the template and keep the header exactly as NAME ID.");
            }

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? headerRow.RowNumber();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var ids = new List<string>();
            var duplicates = 0;
            var emptyRows = 0;

            for (var rowNumber = headerRow.RowNumber() + 1; rowNumber <= lastRow; rowNumber++)
            {
                var text = ReadId(sheet.Cell(rowNumber, column));
                if (text.Length == 0)
                {
                    emptyRows++;
                    continue;
                }

                if (!seen.Add(text))
                {
                    duplicates++;
                    continue;
                }

                ids.Add(text);
            }

            return new ExcelImportResult(fileName, ids, duplicates, emptyRows);
        }
    }

    public ExcelImportResult ReadFile(string path)
    {
        using var stream = File.OpenRead(path);
        return Read(stream, Path.GetFileName(path));
    }

    private static int FindNameIdColumn(IXLRow headerRow)
    {
        foreach (var cell in headerRow.CellsUsed())
        {
            if (string.Equals(ReadId(cell), ColumnHeader, StringComparison.Ordinal))
            {
                return cell.Address.ColumnNumber;
            }
        }

        return 0;
    }

    private static string ReadId(IXLCell cell)
    {
        if (cell.IsEmpty())
        {
            return "";
        }

        var value = cell.Value;
        switch (value.Type)
        {
            case XLDataType.Blank:
                return "";
            case XLDataType.Text:
                return value.GetText().Trim();
            case XLDataType.Number:
                return FormatNumber(value.GetNumber(), cell);
            case XLDataType.Boolean:
            case XLDataType.DateTime:
            case XLDataType.TimeSpan:
            case XLDataType.Error:
                return cell.GetString().Trim();
            default:
                return UnexpectedCellType(value.Type);
        }
    }

    private static string FormatNumber(double number, IXLCell cell)
    {
        if (double.IsFinite(number)
            && number >= 0
            && number < 1_000_000_000_000_000d
            && Math.Abs(number - Math.Round(number)) < 0.000_000_1d)
        {
            return Math.Round(number).ToString("0", CultureInfo.InvariantCulture);
        }

        return cell.GetString().Trim();
    }

    private static string UnexpectedCellType(XLDataType type) => type switch
    {
        XLDataType.Blank => "",
        XLDataType.Boolean => "",
        XLDataType.Number => "",
        XLDataType.Text => "",
        XLDataType.Error => "",
        XLDataType.DateTime => "",
        XLDataType.TimeSpan => "",
        _ => throw new ExcelFormatException($"The NAME ID column contains an unsupported cell type ({type})."),
    };
}
