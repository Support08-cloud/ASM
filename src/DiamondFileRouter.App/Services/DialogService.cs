using System.IO;
using System.Windows;
using Microsoft.Win32;

namespace DiamondFileRouter.App.Services;

public interface IDialogService
{
    string? PickFolder(string title, string? initialPath);
    IReadOnlyList<string>? PickFiles(string title, string? initialPath);
    bool Confirm(string title, string message);
    void Alert(string title, string message);
    void OpenPath(string path);
}

public sealed class DialogService : IDialogService
{
    public string? PickFolder(string title, string? initialPath)
    {
        var dialog = new OpenFolderDialog
        {
            Title = title,
            InitialDirectory = Directory.Exists(initialPath) ? initialPath : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)
        };
        return dialog.ShowDialog() == true ? dialog.FolderName : null;
    }

    public IReadOnlyList<string>? PickFiles(string title, string? initialPath)
    {
        var dialog = new OpenFileDialog
        {
            Title = title,
            Multiselect = true,
            CheckFileExists = true,
            InitialDirectory = Directory.Exists(initialPath) ? initialPath : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)
        };
        return dialog.ShowDialog() == true ? dialog.FileNames : null;
    }

    public bool Confirm(string title, string message) =>
        MessageBox.Show(message, title, MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes;

    public void Alert(string title, string message) =>
        MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);

    public void OpenPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return;
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = path,
            UseShellExecute = true
        });
    }
}
