using System.Text;
using System.Windows;
using DiamondFileRouter.App.Services;
using DiamondFileRouter.App.ViewModels;

namespace DiamondFileRouter.App;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        DispatcherUnhandledException += (_, args) =>
        {
            MessageBox.Show(Flatten(args.Exception), "Diamond File Router", MessageBoxButton.OK, MessageBoxImage.Error);
            args.Handled = true;
        };
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception ex)
                MessageBox.Show(Flatten(ex), "Diamond File Router", MessageBoxButton.OK, MessageBoxImage.Error);
        };

        base.OnStartup(e);

        try
        {
            var services = AppServices.Create();
            var main = new MainWindow(new MainViewModel(services));
            MainWindow = main;
            main.Show();
        }
        catch (Exception ex)
        {
            MessageBox.Show(Flatten(ex), "Diamond File Router", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(-1);
        }
    }

    private static string Flatten(Exception ex)
    {
        var text = new StringBuilder();
        for (var current = ex; current is not null; current = current.InnerException)
        {
            if (text.Length > 0)
                text.AppendLine().AppendLine("---");
            text.Append(current.Message);
        }
        return text.ToString();
    }
}
