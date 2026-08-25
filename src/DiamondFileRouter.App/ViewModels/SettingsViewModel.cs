using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DiamondFileRouter.App.Services;
using DiamondFileRouter.Core.Models;

namespace DiamondFileRouter.App.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly AppServices _services;

    public SettingsViewModel(AppServices services)
    {
        _services = services;
        var loaded = services.Settings.Load();
        DefaultInputDirectory = loaded.DefaultInputDirectory ?? string.Empty;
        DefaultOutputDirectory = loaded.DefaultOutputDirectory ?? string.Empty;
        TransferMode = loaded.TransferMode;
        DuplicateHandling = loaded.DuplicateHandling;
        RecursiveScanning = loaded.RecursiveScanning;
        PreviewBeforeProcessing = loaded.PreviewBeforeProcessing;
        ConfirmationBeforeReplacement = loaded.ConfirmationBeforeReplacement;
        LoggingEnabled = loaded.LoggingEnabled;
        ReportLocation = loaded.ReportLocation ?? Path.Combine(services.DataDirectory, "Reports");
        WriteCsv = loaded.ReportFormats.HasFlag(ReportFormat.Csv);
        WriteJson = loaded.ReportFormats.HasFlag(ReportFormat.Json);
        WriteTxt = loaded.ReportFormats.HasFlag(ReportFormat.Txt);
    }

    public IReadOnlyList<TransferMode> TransferModes { get; } = Enum.GetValues<TransferMode>();
    public IReadOnlyList<DuplicateAction> DuplicateActions { get; } = Enum.GetValues<DuplicateAction>();

    [ObservableProperty] private string _defaultInputDirectory = string.Empty;
    [ObservableProperty] private string _defaultOutputDirectory = string.Empty;
    [ObservableProperty] private TransferMode _transferMode;
    [ObservableProperty] private DuplicateAction _duplicateHandling;
    [ObservableProperty] private bool _recursiveScanning = true;
    [ObservableProperty] private bool _previewBeforeProcessing = true;
    [ObservableProperty] private bool _confirmationBeforeReplacement = true;
    [ObservableProperty] private bool _loggingEnabled = true;
    [ObservableProperty] private string _reportLocation = string.Empty;
    [ObservableProperty] private bool _writeCsv = true;
    [ObservableProperty] private bool _writeJson = true;
    [ObservableProperty] private bool _writeTxt = true;
    [ObservableProperty] private string _status = "Settings are stored locally and never sent anywhere.";

    [RelayCommand]
    private void BrowseInput()
    {
        var folder = _services.Dialogs.PickFolder("Default Input directory", DefaultInputDirectory);
        if (folder is not null)
            DefaultInputDirectory = folder;
    }

    [RelayCommand]
    private void BrowseOutput()
    {
        var folder = _services.Dialogs.PickFolder("Default Output directory", DefaultOutputDirectory);
        if (folder is not null)
            DefaultOutputDirectory = folder;
    }

    [RelayCommand]
    private void BrowseReports()
    {
        var folder = _services.Dialogs.PickFolder("Report location", ReportLocation);
        if (folder is not null)
            ReportLocation = folder;
    }

    [RelayCommand]
    private void Save()
    {
        var formats = ReportFormat.None;
        if (WriteCsv) formats |= ReportFormat.Csv;
        if (WriteJson) formats |= ReportFormat.Json;
        if (WriteTxt) formats |= ReportFormat.Txt;
        if (formats == ReportFormat.None)
            formats = ReportFormat.Csv;

        _services.Settings.Save(new AppSettings
        {
            DefaultInputDirectory = DefaultInputDirectory,
            DefaultOutputDirectory = DefaultOutputDirectory,
            TransferMode = TransferMode,
            DuplicateHandling = DuplicateHandling,
            RecursiveScanning = RecursiveScanning,
            PreviewBeforeProcessing = PreviewBeforeProcessing,
            ConfirmationBeforeReplacement = ConfirmationBeforeReplacement,
            LoggingEnabled = LoggingEnabled,
            ReportLocation = ReportLocation,
            ReportFormats = formats
        });
        Status = "Saved locally.";
    }

    [RelayCommand]
    private void OpenDataFolder() => _services.Dialogs.OpenPath(_services.DataDirectory);
}
