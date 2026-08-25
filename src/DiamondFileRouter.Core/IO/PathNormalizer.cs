using System.Runtime.InteropServices;

namespace DiamondFileRouter.Core.IO;

public static class PathNormalizer
{
    public static StringComparison Comparison { get; } =
        RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;

    public static string Normalize(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException("Path is empty.", nameof(path));

        var trimmed = path.Trim().Trim('"');
        var full = Path.GetFullPath(trimmed);
        return StripLongPathPrefix(TrimDirectorySeparators(full));
    }

    public static string TrimDirectorySeparators(string path) =>
        path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

    public static string EnsureLongPath(string path)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return path;

        if (path.StartsWith(@"\\?\", StringComparison.Ordinal) ||
            path.StartsWith(@"\\?\UNC\", StringComparison.OrdinalIgnoreCase))
            return path;

        if (path.StartsWith(@"\\", StringComparison.Ordinal))
            return @"\\?\UNC\" + path[2..];

        return @"\\?\" + path;
    }

    public static string StripLongPathPrefix(string path)
    {
        if (path.StartsWith(@"\\?\UNC\", StringComparison.OrdinalIgnoreCase))
            return @"\\" + path[8..];
        if (path.StartsWith(@"\\?\", StringComparison.Ordinal))
            return path[4..];
        return path;
    }

    public static bool EqualsNormalized(string left, string right) =>
        string.Equals(Normalize(left), Normalize(right), Comparison);

    public static bool IsSameOrNested(string outer, string inner)
    {
        var a = Normalize(outer) + Path.DirectorySeparatorChar;
        var b = Normalize(inner) + Path.DirectorySeparatorChar;
        return b.StartsWith(a, Comparison);
    }

    public static string Combine(params string[] parts) => Path.GetFullPath(Path.Combine(parts));
}
