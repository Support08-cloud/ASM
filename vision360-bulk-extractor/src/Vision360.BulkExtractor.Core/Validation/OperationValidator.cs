namespace Vision360.BulkExtractor.Validation;

public sealed record OperationInput(bool HasImport, int IdCount, string? SourcePath, string? DestinationPath);

public sealed record ValidationResult(bool CanStart, IReadOnlyList<string> Errors, bool DestinationWillBeCreated);

public static class PathGuard
{
    public static bool Overlaps(string source, string destination)
    {
        var left = Normalize(source);
        var right = Normalize(destination);
        if (left.Length == 0 || right.Length == 0)
        {
            return false;
        }

        if (string.Equals(left, right, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return IsSubPath(left, right) || IsSubPath(right, left);
    }

    public static bool IsInsideOrEqual(string root, string candidate)
    {
        var parent = Normalize(root);
        var child = Normalize(candidate);
        if (parent.Length == 0 || child.Length == 0)
        {
            return false;
        }

        return string.Equals(parent, child, StringComparison.OrdinalIgnoreCase) || IsSubPath(parent, child);
    }

    public static string Normalize(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "";
        }

        try
        {
            return Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }
        catch (Exception exception) when (exception is ArgumentException or NotSupportedException or PathTooLongException)
        {
            return "";
        }
    }

    private static bool IsSubPath(string parent, string child)
    {
        return child.StartsWith(parent + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
    }
}

public static class OperationValidator
{
    public static ValidationResult Validate(OperationInput input)
    {
        var errors = new List<string>();
        var destinationWillBeCreated = false;

        if (!input.HasImport)
        {
            errors.Add("Upload an Excel file before copying.");
        }
        else if (input.IdCount < 1)
        {
            errors.Add("The Excel file does not contain any NAME ID values.");
        }

        var source = input.SourcePath?.Trim() ?? "";
        var destination = input.DestinationPath?.Trim() ?? "";

        if (source.Length == 0)
        {
            errors.Add("Select a source folder.");
        }
        else if (!Directory.Exists(source))
        {
            errors.Add("The source folder does not exist or cannot be opened.");
        }
        else
        {
            try
            {
                using var enumerator = Directory.EnumerateFileSystemEntries(source).GetEnumerator();
                _ = enumerator.MoveNext();
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                errors.Add("The source folder is not accessible.");
            }
        }

        if (destination.Length == 0)
        {
            errors.Add("Select a destination folder.");
        }
        else if (File.Exists(destination))
        {
            errors.Add("The destination path is a file. Choose a folder.");
        }
        else if (Directory.Exists(destination))
        {
            if (!CanWrite(destination))
            {
                errors.Add("The destination folder is not writable.");
            }
        }
        else if (!CanCreate(destination))
        {
            errors.Add("The destination folder cannot be created. Choose a writable location.");
        }
        else
        {
            destinationWillBeCreated = true;
        }

        if (source.Length > 0 && destination.Length > 0 && PathGuard.Overlaps(source, destination))
        {
            errors.Add("The source and destination folders overlap. Choose a destination outside the source so files are not copied into themselves.");
        }

        return new ValidationResult(errors.Count == 0, errors, destinationWillBeCreated && errors.Count == 0);
    }

    public static string? FreeSpaceError(long estimatedBytes, long? availableBytes)
    {
        if (availableBytes is null || estimatedBytes <= 0)
        {
            return null;
        }

        if (estimatedBytes > availableBytes.Value)
        {
            return $"Not enough free space. About {Text.ByteText.Format(estimatedBytes)} is needed, and {Text.ByteText.Format(availableBytes.Value)} is available.";
        }

        return null;
    }

    public static long? TryGetAvailableBytes(string path)
    {
        try
        {
            var current = Path.GetFullPath(path);
            while (!string.IsNullOrEmpty(current) && !Directory.Exists(current))
            {
                var parent = Path.GetDirectoryName(current);
                if (string.IsNullOrEmpty(parent) || string.Equals(parent, current, StringComparison.OrdinalIgnoreCase))
                {
                    break;
                }

                current = parent;
            }

            var root = Path.GetPathRoot(string.IsNullOrEmpty(current) ? Path.GetFullPath(path) : current);
            if (string.IsNullOrEmpty(root))
            {
                return null;
            }

            var drive = new DriveInfo(root);
            return drive.IsReady ? drive.AvailableFreeSpace : null;
        }
        catch (Exception exception) when (exception is IOException or ArgumentException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static bool CanWrite(string directory)
    {
        var probe = Path.Combine(directory, ".v360-write-probe-" + Guid.NewGuid().ToString("N"));
        try
        {
            using (File.Create(probe))
            {
            }

            File.Delete(probe);
            return true;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            TryDelete(probe);
            return false;
        }
    }

    private static bool CanCreate(string destination)
    {
        try
        {
            var parent = Path.GetDirectoryName(Path.GetFullPath(destination));
            while (!string.IsNullOrEmpty(parent) && !Directory.Exists(parent))
            {
                var next = Path.GetDirectoryName(parent);
                if (string.IsNullOrEmpty(next) || string.Equals(next, parent, StringComparison.OrdinalIgnoreCase))
                {
                    break;
                }

                parent = next;
            }

            return !string.IsNullOrEmpty(parent) && Directory.Exists(parent) && CanWrite(parent);
        }
        catch (Exception exception) when (exception is IOException or ArgumentException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
        }
    }
}
