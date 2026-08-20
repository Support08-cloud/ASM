using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace DiamondFileRouter.Core.Models;

public sealed class ProcessingPlanItem : INotifyPropertyChanged
{
    private string? _stoneId;
    private string? _destinationFolder;
    private string? _destinationFilePath;
    private MatchMethod _matchMethod;
    private ItemStatus _status = ItemStatus.Pending;
    private DuplicateStatus _duplicateStatus = DuplicateStatus.None;
    private string? _errorInformation;
    private string? _reason;
    private string? _relativePathWithinStone;
    private bool _destinationExistedAtAnalysis;

    public Guid Id { get; init; } = Guid.NewGuid();
    public required string SourcePath { get; init; }
    public required string SourceFileName { get; init; }
    public required string SourceExtension { get; init; }
    public required string ParentFolder { get; init; }
    public long FileSizeBytes { get; init; }

    public string? StoneId { get => _stoneId; set => Set(ref _stoneId, value); }
    public string? DestinationFolder { get => _destinationFolder; set => Set(ref _destinationFolder, value); }
    public string? DestinationFilePath { get => _destinationFilePath; set => Set(ref _destinationFilePath, value); }
    public MatchMethod MatchMethod { get => _matchMethod; set => Set(ref _matchMethod, value); }
    public ItemStatus Status { get => _status; set => Set(ref _status, value); }
    public DuplicateStatus DuplicateStatus { get => _duplicateStatus; set => Set(ref _duplicateStatus, value); }
    public string? ErrorInformation { get => _errorInformation; set => Set(ref _errorInformation, value); }
    public string? Reason { get => _reason; set => Set(ref _reason, value); }
    public string? RelativePathWithinStone { get => _relativePathWithinStone; set => Set(ref _relativePathWithinStone, value); }
    public bool DestinationExistedAtAnalysis { get => _destinationExistedAtAnalysis; set => Set(ref _destinationExistedAtAnalysis, value); }

    public string DestinationFolderName => string.IsNullOrWhiteSpace(DestinationFolder) ? string.Empty : Path.GetFileName(DestinationFolder);
    public string MatchMethodDisplay => MatchMethod switch
    {
        MatchMethod.ExactFolderName => "Exact name",
        MatchMethod.FilenamePrefix => "Filename prefix",
        MatchMethod.ParentFolderName => "Parent folder",
        MatchMethod.FolderName => "Folder name",
        _ => "—"
    };

    public event PropertyChangedEventHandler? PropertyChanged;

    private void Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (Equals(field, value))
            return;
        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
        if (name is nameof(DestinationFolder))
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(DestinationFolderName)));
        if (name is nameof(MatchMethod))
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(MatchMethodDisplay)));
    }
}
