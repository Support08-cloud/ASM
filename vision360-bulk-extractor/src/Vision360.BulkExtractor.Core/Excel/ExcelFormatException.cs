namespace Vision360.BulkExtractor.Excel;

public sealed class ExcelFormatException : Exception
{
    public ExcelFormatException(string message)
        : base(message)
    {
    }
}
