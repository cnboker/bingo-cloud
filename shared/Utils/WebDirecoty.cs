using System.Collections.Generic;
using System.Linq;
using System.IO;
using Ioliz.Shared.Utils;
using Ioliz.Shared;

public class WebDirectory
{
    public static Dictionary<string, NodeBase> FileMap(string dir,string userName)
    {
        DirectoryJsonGenerator generator = new DirectoryJsonGenerator(dir);
        generator.CreateFolderHierarchy(userName);
        return generator.fileMap;
    }
}

public class DirectoryJsonGenerator
{
    public string RootFolderId { get; set; }
    private DirectoryInfo rootInfo;
    public Dictionary<string, NodeBase> fileMap = new Dictionary<string, NodeBase>();
    int rootDirLength = 0;
  
    public DirectoryJsonGenerator(string dir)
    {
        rootInfo = new DirectoryInfo(dir);
        rootDirLength = rootInfo.FullName.Length;
        RootFolderId = StringHelper.IdGenerate();
    }

    public void CreateFolderHierarchy(string userName)
    {
        var node = new DirNode()
        {
            Id = RootFolderId,
            //根目录显示空不显示用户名称
            Name = "",
            ParentId = "",
        };
        var dirNodes = GetDirNodes(RootFolderId, this.rootInfo,userName);
        var filesNodes = GetFileNodes(RootFolderId, this.rootInfo,userName);
        node.ChildrenCount = dirNodes.Count() + filesNodes.Count();
        node.ChildrenIds = dirNodes.Select(c=>c.Id).Union(filesNodes.Select(c=>c.Id)).ToArray();
        fileMap.Add(RootFolderId, node);
        foreach (var item in filesNodes)
        {
            fileMap.Add(item.Id, item);
        }
    }


    private FileNode[] GetFileNodes(string parentId, DirectoryInfo dir, string userName)
    {
        return dir.GetFiles().Select(c =>
        {
            var path = c.DirectoryName.Substring(rootDirLength) + "/" + c.Name;
            return new FileNode()
            {
                Id = StringHelper.IdGenerate(),
                Name = c.Name,
                Size = c.Length,
                ModDate = c.LastWriteTime.ToLongDateString(),
                ParentId = parentId,
                ThumbnailUrl = GetThumbnailUrl(c.Name, userName)
            };
        }).ToArray();
    }

    public static string GetThumbnailUrl(string fileName, string userName)
    {
        var mimeType = MimeTypes.GetMimeType(fileName);
        var type = "image";
        if (mimeType.StartsWith("image/"))
        {
            type = "image";
        }
        else if (mimeType.StartsWith("video/"))
        {
            type = "video";
        }

        return string.Format("/{0}?size=512x512&type={1}&user={2}", fileName, type, userName);
    }

    public DirNode[] GetDirNodes(string parentId, DirectoryInfo dir,string userName)
    {
        var children = dir.GetDirectories();
        List<DirNode> dirNodesList = new List<DirNode>();
        foreach (var child in children)
        {
            var node = new DirNode()
            {
                Id = StringHelper.IdGenerate(),
                Name = child.Name,
                ParentId = parentId,
            };
            var childDirNodes = GetDirNodes(node.Id, child,userName);
            var childFileNodes = GetFileNodes(node.Id, child,userName);

            node.ChildrenIds = childDirNodes.Select(c=>c.Id).Union(childFileNodes.Select(c=>c.Id)).ToArray();
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

public class FileNode : NodeBase
{
    public string ModDate { get; set; }

    public long Size { get; set; }
    public bool IsDir
    {
        get
        {
            return false;
        }
    }
    public string ThumbnailUrl { get; set; }
}

public class DirNode : NodeBase
{
    public int ChildrenCount {get;set;}
    public string[] ChildrenIds { get; set; }
    public bool IsDir
    {
        get
        {
            return true;
        }
    }
}


public class NodeBase
{
    public string Id { get; set; }
    public string Name { get; set; }

    public string ParentId { get; set; }

}
