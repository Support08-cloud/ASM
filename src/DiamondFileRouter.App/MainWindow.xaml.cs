using System.Windows;
using DiamondFileRouter.App.ViewModels;

namespace DiamondFileRouter.App;

public partial class MainWindow : Window
{
    public MainWindow(MainViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
    }
}
