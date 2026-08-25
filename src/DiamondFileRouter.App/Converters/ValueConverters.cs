using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.App.Converters;

public sealed class StatusToBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var status = value is ItemStatus s ? s : ItemStatus.Pending;
        return status switch
        {
            ItemStatus.Matched or ItemStatus.Completed => Brush("#EAF6EF"),
            ItemStatus.Unmatched => Brush("#FFF3E6"),
            ItemStatus.Error => Brush("#FDECEA"),
            ItemStatus.Skipped or ItemStatus.AlreadyExists => Brush("#F7F1EA"),
            ItemStatus.Copying or ItemStatus.Analyzing => Brush("#FFF3E6"),
            ItemStatus.Cancelled => Brush("#F7F1EA"),
            _ => Brush("#FFFFFF")
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) =>
        throw new NotSupportedException();

    private static SolidColorBrush Brush(string hex) =>
        (SolidColorBrush)new BrushConverter().ConvertFromString(hex)!;
}

public sealed class StatusToForegroundConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var status = value is ItemStatus s ? s : ItemStatus.Pending;
        return status switch
        {
            ItemStatus.Matched or ItemStatus.Completed => Brush("#067647"),
            ItemStatus.Unmatched => Brush("#9A4E12"),
            ItemStatus.Error => Brush("#B42318"),
            ItemStatus.Skipped or ItemStatus.AlreadyExists => Brush("#6D6E71"),
            ItemStatus.Cancelled => Brush("#6D6E71"),
            _ => Brush("#111111")
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) =>
        throw new NotSupportedException();

    private static SolidColorBrush Brush(string hex) =>
        (SolidColorBrush)new BrushConverter().ConvertFromString(hex)!;
}

public sealed class InverseBoolConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture) =>
        value is bool b && !b;

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) =>
        value is bool b && !b;
}

public sealed class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture) =>
        value is null or "" ? Visibility.Collapsed : Visibility.Visible;

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}

public sealed class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture) =>
        value is true ? Visibility.Visible : Visibility.Collapsed;

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}

public sealed class EqualsStringConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture) =>
        string.Equals(value?.ToString(), parameter?.ToString(), StringComparison.OrdinalIgnoreCase);

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is true)
            return parameter?.ToString() ?? Binding.DoNothing;
        return Binding.DoNothing;
    }
}
