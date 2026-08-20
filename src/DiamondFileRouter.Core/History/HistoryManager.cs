using DiamondFileRouter.Core.Models;
using Microsoft.Data.Sqlite;

namespace DiamondFileRouter.Core.History;

public interface IHistoryManager
{
    void Add(HistoryRecord record);
    IReadOnlyList<HistoryRecord> List(int limit = 200);
}

public sealed class HistoryManager : IHistoryManager
{
    private readonly string _connectionString;

    public HistoryManager(string databasePath)
    {
        var directory = Path.GetDirectoryName(databasePath);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();
        Initialize();
    }

    private void Initialize()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                input_path TEXT NOT NULL,
                output_path TEXT NOT NULL,
                total_files INTEGER NOT NULL,
                matched INTEGER NOT NULL,
                copied INTEGER NOT NULL,
                skipped INTEGER NOT NULL,
                unmatched INTEGER NOT NULL,
                errors INTEGER NOT NULL,
                duration_ms INTEGER NOT NULL,
                result TEXT NOT NULL,
                report_path TEXT
            );
            """;
        cmd.ExecuteNonQuery();
    }

    public void Add(HistoryRecord record)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            INSERT INTO sessions
            (id, timestamp, input_path, output_path, total_files, matched, copied, skipped, unmatched, errors, duration_ms, result, report_path)
            VALUES
            ($id, $timestamp, $input, $output, $total, $matched, $copied, $skipped, $unmatched, $errors, $duration, $result, $report);
            """;
        cmd.Parameters.AddWithValue("$id", record.Id);
        cmd.Parameters.AddWithValue("$timestamp", record.Timestamp.ToString("o"));
        cmd.Parameters.AddWithValue("$input", record.InputPath);
        cmd.Parameters.AddWithValue("$output", record.OutputPath);
        cmd.Parameters.AddWithValue("$total", record.TotalFiles);
        cmd.Parameters.AddWithValue("$matched", record.Matched);
        cmd.Parameters.AddWithValue("$copied", record.Copied);
        cmd.Parameters.AddWithValue("$skipped", record.Skipped);
        cmd.Parameters.AddWithValue("$unmatched", record.Unmatched);
        cmd.Parameters.AddWithValue("$errors", record.Errors);
        cmd.Parameters.AddWithValue("$duration", (long)record.Duration.TotalMilliseconds);
        cmd.Parameters.AddWithValue("$result", record.Result);
        cmd.Parameters.AddWithValue("$report", (object?)record.ReportPath ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public IReadOnlyList<HistoryRecord> List(int limit = 200)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT id, timestamp, input_path, output_path, total_files, matched, copied, skipped, unmatched, errors, duration_ms, result, report_path FROM sessions ORDER BY timestamp DESC LIMIT $limit;";
        cmd.Parameters.AddWithValue("$limit", limit);
        var list = new List<HistoryRecord>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            list.Add(new HistoryRecord
            {
                Id = reader.GetString(0),
                Timestamp = DateTimeOffset.Parse(reader.GetString(1)),
                InputPath = reader.GetString(2),
                OutputPath = reader.GetString(3),
                TotalFiles = reader.GetInt32(4),
                Matched = reader.GetInt32(5),
                Copied = reader.GetInt32(6),
                Skipped = reader.GetInt32(7),
                Unmatched = reader.GetInt32(8),
                Errors = reader.GetInt32(9),
                Duration = TimeSpan.FromMilliseconds(reader.GetInt64(10)),
                Result = reader.GetString(11),
                ReportPath = reader.IsDBNull(12) ? null : reader.GetString(12)
            });
        }
        return list;
    }
}
