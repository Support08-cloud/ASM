using System.Windows;
using System.Windows.Media.Imaging;
using DiamondFileRouter.App.ViewModels;

namespace DiamondFileRouter.App;

public partial class MainWindow : Window
{
    public MainWindow(MainViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
        TryLoadBrandArt();
    }

    private void TryLoadBrandArt()
    {
        try
        {
            Icon = BitmapFrame.Create(
                new Uri("pack://application:,,,/Assets/app.ico", UriKind.Absolute),
                BitmapCreateOptions.IgnoreImageCache,
                BitmapCacheOption.OnLoad);
        }
        catch
        {
            // Window still opens if the icon cannot be decoded.
        }

        try
        {
            BrandLogo.Source = new BitmapImage(new Uri("pack://application:,,,/Assets/logo-white.png", UriKind.Absolute));
        }
        catch
        {
            // Brand text remains visible without the logo.
        }
    }
}
