namespace DiamondFileRouter.Core.Models;

public sealed class DestinationIndex
{
    private readonly Dictionary<string, string> _folders;

    public DestinationIndex(IDictionary<string, string> folders)
    {
        _folders = new Dictionary<string, string>(folders, StringComparer.OrdinalIgnoreCase);
    }

    public static DestinationIndex Empty { get; } = new(new Dictionary<string, string>());

    public int Count => _folders.Count;

    public string RootPath { get; init; } = string.Empty;

    public bool TryGet(string stoneId, out string destinationPath)
    {
        if (string.IsNullOrWhiteSpace(stoneId))
        {
            destinationPath = string.Empty;
            return false;
        }

        return _folders.TryGetValue(stoneId.Trim(), out destinationPath!);
    }

    public IEnumerable<string> StoneIds => _folders.Keys;

    public IReadOnlyDictionary<string, string> Folders => _folders;
}
