using System.Windows;

namespace Vision360.BulkExtractor.Dialogs;

public partial class LogWindow : Window
{
    public LogWindow(string logText, string? logFilePath)
    {
        InitializeComponent();
        LogText.Text = logText;
        PathText.Text = string.IsNullOrWhiteSpace(logFilePath)
            ? "This log is shown here only."
            : $"Saved log: {logFilePath}";
    }
}
