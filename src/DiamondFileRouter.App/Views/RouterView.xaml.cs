using System.Windows;
using System.Windows.Controls;

namespace DiamondFileRouter.App.Views;

public partial class RouterView : UserControl
{
    public RouterView()
    {
        InitializeComponent();
    }

    private void OnDragOver(object sender, DragEventArgs e)
    {
        e.Effects = e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    private void OnDrop(object sender, DragEventArgs e)
    {
        if (DataContext is ViewModels.RouterViewModel vm &&
            e.Data.GetData(DataFormats.FileDrop) is string[] paths)
        {
            vm.AcceptDrop(paths);
        }
    }
}
