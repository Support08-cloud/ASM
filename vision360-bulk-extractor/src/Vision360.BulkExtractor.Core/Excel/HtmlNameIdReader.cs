using System.Net;
using System.Text.RegularExpressions;

namespace Vision360.BulkExtractor.Excel;

public sealed partial class HtmlNameIdReader
{
    public ExcelImportResult Read(string html, string fileName)
    {
        var rows = ExtractRows(html);
        if (rows.Count == 0)
        {
            throw new ExcelFormatException(
                "This HTML file has no table. Use a table with a NAME ID header and one ID in each row below it.");
        }

        var headerRow = -1;
        var headerColumn = -1;
        var scanUntil = Math.Min(rows.Count, 30);
        for (var rowIndex = 0; rowIndex < scanUntil; rowIndex++)
        {
            for (var column = 0; column < rows[rowIndex].Count; column++)
            {
                if (IsNameId(rows[rowIndex][column]))
                {
                    headerRow = rowIndex;
                    headerColumn = column;
                    break;
                }
            }

            if (headerRow >= 0)
            {
                break;
            }
        }

        if (headerRow < 0)
        {
            throw new ExcelFormatException(
                "The required column NAME ID is missing from this HTML file. Keep the header as NAME ID and put one ID on each row below it.");
        }

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ids = new List<string>();
        var duplicates = 0;
        var emptyRows = 0;
        for (var rowIndex = headerRow + 1; rowIndex < rows.Count; rowIndex++)
        {
            var text = headerColumn < rows[rowIndex].Count ? rows[rowIndex][headerColumn].Trim() : "";
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

    public ExcelImportResult ReadFile(string path)
    {
        return Read(File.ReadAllText(path), Path.GetFileName(path));
    }

    private static bool IsNameId(string text)
    {
        var parts = text.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return string.Equals(string.Join(' ', parts), ExcelNameIdReader.ColumnHeader, StringComparison.OrdinalIgnoreCase);
    }

    private static List<List<string>> ExtractRows(string html)
    {
        var rows = new List<List<string>>();
        foreach (Match row in RowPattern().Matches(html))
        {
            var cells = new List<string>();
            foreach (Match cell in CellPattern().Matches(row.Groups[1].Value))
            {
                cells.Add(CleanCell(cell.Groups[1].Value));
            }

            if (cells.Count > 0)
            {
                rows.Add(cells);
            }
        }

        return rows;
    }

    private static string CleanCell(string value)
    {
        var withoutBreaks = BreakPattern().Replace(value, " ");
        var withoutTags = TagPattern().Replace(withoutBreaks, " ");
        return WebUtility.HtmlDecode(withoutTags).Trim();
    }

    [GeneratedRegex("<tr\\b[^>]*>(.*?)</tr>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex RowPattern();

    [GeneratedRegex("<t[dh]\\b[^>]*>(.*?)</t[dh]>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex CellPattern();

    [GeneratedRegex("<br\\s*/?>", RegexOptions.IgnoreCase)]
    private static partial Regex BreakPattern();

    [GeneratedRegex("<[^>]+>", RegexOptions.Singleline)]
    private static partial Regex TagPattern();
}
