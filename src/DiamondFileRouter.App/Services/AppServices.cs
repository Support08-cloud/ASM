using System.IO;
using DiamondFileRouter.Core.History;
using DiamondFileRouter.Core.Orchestration;
using DiamondFileRouter.Core.Settings;

namespace DiamondFileRouter.App.Services;

public sealed class AppServices
{
    public required string DataDirectory { get; init; }
    public required ISettingsManager Settings { get; init; }
    public required IHistoryManager History { get; init; }
    public required IRouterOrchestrator Orchestrator { get; init; }
    public required IDialogService Dialogs { get; init; }

    public static AppServices Create()
    {
        var data = RouterOrchestrator.DefaultDataDirectory;
        Directory.CreateDirectory(data);
        Directory.CreateDirectory(Path.Combine(data, "Reports"));
        Directory.CreateDirectory(Path.Combine(data, "Logs"));
        return new AppServices
        {
            DataDirectory = data,
            Settings = AppComposition.CreateSettings(data),
            History = new HistoryManager(Path.Combine(data, "history.db")),
            Orchestrator = RouterOrchestrator.CreateDefault(data),
            Dialogs = new DialogService()
        };
    }
}
