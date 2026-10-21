namespace Vision360.BulkExtractor.Excel;

public sealed record ExcelImportResult(
    string FileName,
    IReadOnlyList<string> Ids,
    int DuplicateCount,
    int EmptyRowCount)
{
    public int ValidIdCount => Ids.Count;

    public string? Warning =>
        Ids.Count == 0
            ? "No NAME ID values were found. Add at least one ID and upload the file again."
            : null;
}
