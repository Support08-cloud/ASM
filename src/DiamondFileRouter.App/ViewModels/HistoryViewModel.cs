using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DiamondFileRouter.App.Services;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.App.ViewModels;

public partial class HistoryViewModel : ObservableObject
{
    private readonly AppServices _services;

    public HistoryViewModel(AppServices services)
    {
        _services = services;
        Refresh();
    }

    public ObservableCollection<HistoryRecord> Records { get; } = new();

    [RelayCommand]
    private void Refresh()
    {
        Records.Clear();
        foreach (var record in _services.History.List())
            Records.Add(record);
    }

    [RelayCommand]
    private void OpenReport(HistoryRecord? record)
    {
        if (record?.ReportPath is { Length: > 0 } path)
            _services.Dialogs.OpenPath(path);
    }
}
