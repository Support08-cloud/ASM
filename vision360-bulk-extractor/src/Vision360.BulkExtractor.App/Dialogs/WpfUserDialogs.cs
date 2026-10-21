using System.IO;
using System.Windows;
using Microsoft.Win32;

namespace Vision360.BulkExtractor.Dialogs;

public interface IUserDialogs
{
    string? ChooseTemplateSavePath();

    string? ChooseExcelOpenPath();

    string? ChooseFolder(string title, string? initialPath);

    bool ConfirmCopy(string message, bool overwrite);

    void ShowInformation(string title, string message);

    void ShowLog(string logText, string? logFilePath);

    bool TryCopyToClipboard(string text, out string? error);
}

public sealed class WpfUserDialogs : IUserDialogs
{
    public string? ChooseTemplateSavePath()
    {
        var dialog = new SaveFileDialog
        {
            Title = "Download Excel template",
            FileName = "NAME-ID-template.xlsx",
            Filter = "Excel workbook (*.xlsx)|*.xlsx",
            AddExtension = true,
            DefaultExt = ".xlsx",
            OverwritePrompt = true,
        };
        return Show(dialog) ? dialog.FileName : null;
    }

    public string? ChooseExcelOpenPath()
    {
        var dialog = new OpenFileDialog
        {
            Title = "Select Excel or HTML file",
            Filter = "Excel or HTML (*.xlsx;*.html;*.htm)|*.xlsx;*.html;*.htm|Excel workbook (*.xlsx)|*.xlsx|HTML file (*.html;*.htm)|*.html;*.htm",
            CheckFileExists = true,
            Multiselect = false,
        };
        return Show(dialog) ? dialog.FileName : null;
    }

    public string? ChooseFolder(string title, string? initialPath)
    {
        var dialog = new OpenFolderDialog
        {
            Title = title,
            Multiselect = false,
        };
        if (!string.IsNullOrWhiteSpace(initialPath) && Directory.Exists(initialPath))
        {
            dialog.InitialDirectory = initialPath;
        }

        return Show(dialog) ? dialog.FolderName : null;
    }

    public bool ConfirmCopy(string message, bool overwrite)
    {
        var window = new ConfirmWindow(message, overwrite);
        AttachOwner(window);
        return window.ShowDialog() == true;
    }

    public void ShowInformation(string title, string message)
    {
        var owner = Owner();
        if (owner is null)
        {
            MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        MessageBox.Show(owner, message, title, MessageBoxButton.OK, MessageBoxImage.Information);
    }

    public void ShowLog(string logText, string? logFilePath)
    {
        var window = new LogWindow(logText, logFilePath);
        AttachOwner(window);
        window.ShowDialog();
    }

    public bool TryCopyToClipboard(string text, out string? error)
    {
        try
        {
            Clipboard.SetText(text);
            error = null;
            return true;
        }
        catch (Exception exception)
        {
            error = exception.Message;
            return false;
        }
    }

    private static bool Show(CommonDialog dialog)
    {
        var owner = Owner();
        return owner is null ? dialog.ShowDialog() == true : dialog.ShowDialog(owner) == true;
    }

    private static void AttachOwner(Window window)
    {
        var owner = Owner();
        if (owner is not null)
        {
            window.Owner = owner;
        }
    }

    private static Window? Owner() =>
        Application.Current?.MainWindow is { IsLoaded: true } window ? window : null;
}
