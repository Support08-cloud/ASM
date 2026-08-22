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
            ItemStatus.Matched or ItemStatus.Completed => Brush("#E8F5E9"),
            ItemStatus.Unmatched => Brush("#FFF8E1"),
            ItemStatus.Error => Brush("#FFEBEE"),
            ItemStatus.Skipped or ItemStatus.AlreadyExists => Brush("#EBECEC"),
            ItemStatus.Copying or ItemStatus.Analyzing => Brush("#E3F2FD"),
            ItemStatus.Cancelled => Brush("#EBECEC"),
            _ => Brush("#FEFEFE")
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
            ItemStatus.Matched or ItemStatus.Completed => Brush("#2E7D32"),
            ItemStatus.Unmatched => Brush("#8E4A12"),
            ItemStatus.Error => Brush("#C62828"),
            ItemStatus.Skipped or ItemStatus.AlreadyExists => Brush("#7A7A79"),
            ItemStatus.Cancelled => Brush("#7A7A79"),
            _ => Brush("#2B2A29")
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
