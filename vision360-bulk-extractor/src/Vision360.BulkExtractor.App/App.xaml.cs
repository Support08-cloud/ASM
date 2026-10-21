using System.Windows;
using System.Windows.Threading;
using Vision360.BulkExtractor.Copying;
using Vision360.BulkExtractor.Dialogs;
using Vision360.BulkExtractor.Excel;
using Vision360.BulkExtractor.Matching;
using Vision360.BulkExtractor.ViewModels;

namespace Vision360.BulkExtractor;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        DispatcherUnhandledException += OnUnhandled;

        var window = new MainWindow
        {
            DataContext = new MainViewModel(
                new ExcelTemplateWriter(),
                new ExcelNameIdReader(),
                new SourceMatcher(),
                new BulkCopyEngine(),
                new CopyPlanner(),
                new WpfUserDialogs()),
        };
        MainWindow = window;
        window.Show();
    }

    private static void OnUnhandled(object sender, DispatcherUnhandledExceptionEventArgs args)
    {
        MessageBox.Show(
            args.Exception.Message,
            "Vision360 Bulk Data Extractor",
            MessageBoxButton.OK,
            MessageBoxImage.Error);
        args.Handled = true;
    }
}
