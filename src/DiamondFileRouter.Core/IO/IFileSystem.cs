namespace DiamondFileRouter.Core.IO;

public interface IFileSystem
{
    bool FileExists(string path);
    bool DirectoryExists(string path);
    IEnumerable<string> EnumerateFiles(string directory, bool recursive);
    IEnumerable<string> EnumerateDirectories(string directory, bool recursive = false);
    long GetFileLength(string path);
    Stream OpenRead(string path);
    Stream OpenWrite(string path, bool overwrite);
    void CreateDirectory(string path);
    void DeleteFile(string path);
    void MoveFile(string source, string destination, bool overwrite);
    void ReplaceFile(string source, string destination);
    FileAttributes GetAttributes(string path);
}
