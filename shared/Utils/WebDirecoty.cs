using System.Collections.Generic;
using System.Linq;
using System.IO;
using Ioliz.Shared.Utils;
using Ioliz.Shared;

public class WebDirectory
{
    public static Dictionary<string, Node> FileMap(string dir, string userName)
    {
        DirectoryJsonGenerator generator = new DirectoryJsonGenerator(dir, userName);
        generator.CreateFolderHierarchy();
        return generator.fileMap;
    }
}

public class DirectoryJsonGenerator
{
    public string RootFolderId { get; set; }
    private DirectoryInfo rootInfo;
    public Dictionary<string, Node> fileMap = new Dictionary<string, Node>();
    int rootDirLength = 0;
    string userName = "";
    public DirectoryJsonGenerator(string dir, string userName)
    {
        rootInfo = new DirectoryInfo(dir);
        rootDirLength = rootInfo.FullName.Length;
        RootFolderId = StringHelper.IdGenerate();
        this.userName = userName;
    }

    public void CreateFolderHierarchy()
    {
        var node = new Node()
        {
            Id = RootFolderId,
            Name = rootInfo.Name,
            ModDate = rootInfo.LastWriteTime.ToLongDateString(),
            ParentId = "",
            Path = "/",
            IsDir = true
        };
        var dirNodes = GetDirNodes(RootFolderId, this.rootInfo);
        var filesNodes = GetFileNodes(RootFolderId, this.rootInfo);
        node.ChildrenCount = dirNodes.Count() + filesNodes.Count();
        node.ChildrenIds = dirNodes.Union(filesNodes).Select(x => x.Id).ToArray();
        fileMap.Add(RootFolderId, node);
        foreach (var item in filesNodes)
        {
            fileMap.Add(item.Id, item);
        }
    }


    private Node[] GetFileNodes(string parentId, DirectoryInfo dir)
    {
        return dir.GetFiles().Select(c =>
        {
            var path = c.DirectoryName.Substring(rootDirLength) + "/" + c.Name;
            return new Node()
            {
                Id = StringHelper.IdGenerate(),
                Name = c.Name,
                Size = c.Length,
                Path = path,
                ModDate = c.LastWriteTime.ToLongDateString(),
                ParentId = parentId,
                ThumbnailUrl = GetThumbnailUrl(path, c.Name, this.userName)
            };
        }).ToArray();
    }

    public static string GetThumbnailUrl(string path, string fileName, string userName)
    {
        var mimeType = MimeTypes.GetMimeType(fileName);
        if (mimeType.StartsWith("image/"))
        {
            return path + "?size=512x512&type=image&user=" + userName;
        }
        else if (mimeType.StartsWith("video/"))
        {
            return path + "?size=512x512&type=video&user=" + userName;
        }
        return "";
    }

    public Node[] GetDirNodes(string parentId, DirectoryInfo dir)
    {
        var children = dir.GetDirectories();
        List<Node> dirNodesList = new List<Node>();
        foreach (var child in children)
        {
            var node = new Node()
            {
                Id = StringHelper.IdGenerate(),
                Name = child.Name,
                ModDate = child.LastWriteTime.ToLongDateString(),
                ParentId = parentId,
                Path = child.FullName.Substring(rootDirLength),
                IsDir = true
            };
            var childDirNodes = GetDirNodes(node.Id, child);
            var childFileNodes = GetFileNodes(node.Id, child);

            node.ChildrenIds = childDirNodes.Union(childFileNodes).Select(x => x.Id).ToArray();
            node.ChildrenCount = node.ChildrenIds.Length;
            dirNodesList.Add(node);
            foreach (var item in childFileNodes)
            {
                fileMap.Add(item.Id, item);
            }
            fileMap.Add(node.Id, node);
        }
        return dirNodesList.ToArray();
    }
}

public class Node
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string ModDate { get; set; }
    public string ParentId { get; set; }
    public long Size { get; set; }
    public string Path { get; set; }
    public bool IsDir { get; set; }
    public string[] ChildrenIds { get; set; }
    public int ChildrenCount { get; set; }
    public string ThumbnailUrl { get; set; }
}

