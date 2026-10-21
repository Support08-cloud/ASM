using System.Windows;

namespace Vision360.BulkExtractor.Dialogs;

public partial class ConfirmWindow : Window
{
    public ConfirmWindow(string message, bool overwrite)
    {
        InitializeComponent();
        MessageText.Text = message;
        if (overwrite)
        {
            OverwriteCheck.Visibility = Visibility.Visible;
            StartButton.Content = "Overwrite and copy";
            StartButton.IsEnabled = false;
            OverwriteCheck.Checked += (_, _) => StartButton.IsEnabled = true;
            OverwriteCheck.Unchecked += (_, _) => StartButton.IsEnabled = false;
        }

        StartButton.Click += (_, _) => DialogResult = true;
    }
}
