using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DiamondFileRouter.App.Services;

namespace DiamondFileRouter.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    public MainViewModel(AppServices services)
    {
        Router = new RouterViewModel(services);
        History = new HistoryViewModel(services);
        Settings = new SettingsViewModel(services);
        CurrentPage = "router";
    }

    public RouterViewModel Router { get; }
    public HistoryViewModel History { get; }
    public SettingsViewModel Settings { get; }

    [ObservableProperty] private string _currentPage = "router";
    public string VersionText => "v1.1.0 · Offline · Brand 2.0";
    public string PageTitle => CurrentPage switch
    {
        "history" => "History",
        "settings" => "Settings",
        _ => "Router"
    };

    partial void OnCurrentPageChanged(string value) => OnPropertyChanged(nameof(PageTitle));

    [RelayCommand]
    private void ShowRouter() => CurrentPage = "router";

    [RelayCommand]
    private void ShowHistory()
    {
        CurrentPage = "history";
        History.RefreshCommand.Execute(null);
    }

    [RelayCommand]
    private void ShowSettings() => CurrentPage = "settings";
}
