namespace Vision360.BulkExtractor.Text;

public static class ByteText
{
    public static string Format(long bytes)
    {
        if (bytes < 0)
        {
            bytes = 0;
        }

        string[] units = ["bytes", "KB", "MB", "GB", "TB"];
        double value = bytes;
        var unit = 0;
        while (value >= 1024 && unit < units.Length - 1)
        {
            value /= 1024;
            unit++;
        }

        return unit == 0 ? $"{bytes} bytes" : $"{value:0.##} {units[unit]}";
    }

    public static string FormatDuration(TimeSpan elapsed)
    {
        if (elapsed < TimeSpan.Zero)
        {
            elapsed = TimeSpan.Zero;
        }

        if (elapsed.TotalHours >= 1)
        {
            return $"{(int)elapsed.TotalHours}:{elapsed.Minutes:00}:{elapsed.Seconds:00}";
        }

        return $"{elapsed.Minutes:00}:{elapsed.Seconds:00}";
    }
}
