using System.Windows;
using DiamondFileRouter.App.Services;
using DiamondFileRouter.App.ViewModels;

namespace DiamondFileRouter.App;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        DispatcherUnhandledException += (_, args) =>
        {
            MessageBox.Show(args.Exception.Message, "Diamond File Router", MessageBoxButton.OK, MessageBoxImage.Error);
            args.Handled = true;
        };

        var services = AppServices.Create();
        var main = new MainWindow(new MainViewModel(services));
        MainWindow = main;
        main.Show();
    }
}
