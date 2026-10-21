using System.Text;

namespace Vision360.BulkExtractor.Logging;

public sealed class ExtractionLog
{
    private readonly StringBuilder _text = new();
    private readonly object _gate = new();

    public void Info(string message) => Write("INFO", message);

    public void Error(string message) => Write("ERROR", message);

    public string Text
    {
        get
        {
            lock (_gate)
            {
                return _text.ToString();
            }
        }
    }

    public string Save()
    {
        var directory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Vision360",
            "BulkDataExtractor",
            "logs");
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"extraction-{DateTime.Now:yyyyMMdd-HHmmss}.log");
        File.WriteAllText(path, Text);
        return path;
    }

    private void Write(string level, string message)
    {
        var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}  {level}  {message}";
        lock (_gate)
        {
            _text.AppendLine(line);
        }
    }
}
