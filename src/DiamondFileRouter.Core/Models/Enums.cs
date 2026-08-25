namespace DiamondFileRouter.Core.Models;

public enum ItemStatus
{
    Pending,
    Analyzing,
    Matched,
    Unmatched,
    Copying,
    Completed,
    Skipped,
    AlreadyExists,
    Error,
    Cancelled
}

public enum MatchMethod
{
    None,
    ExactFolderName,
    FilenamePrefix,
    ParentFolderName,
    FolderName
}

public enum DuplicateAction
{
    Skip,
    Replace,
    Rename
}

public enum DuplicateStatus
{
    None,
    AlreadyExists,
    Skipped,
    Replaced,
    Renamed
}

public enum TransferMode
{
    Copy,
    Move
}

[Flags]
public enum ReportFormat
{
    None = 0,
    Csv = 1,
    Json = 2,
    Txt = 4,
    All = Csv | Json | Txt
}

public enum SessionOutcome
{
    Completed,
    CompletedWithErrors,
    Cancelled,
    Failed
}
