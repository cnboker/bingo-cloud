using System.Collections.Generic;
using System.Linq;
using System.IO;
using Ioliz.Shared.Utils;
using Ioliz.Shared;
using System;

namespace Ioliz.Shared.Utils
{
    public class WebDirectory : DirectoryJsonGenerator
    {
        private string domain;
        //current userName
        private string userName;
        public WebDirectory(string domain, string userName) : base()
        {
            this.domain = domain;
            this.userName = userName;
        }
        //return path include domain 
        public override string GetPath(string fileFullName)
        {
            return domain + base.GetPath(fileFullName);
        }

        public override string GetThumbnailUrl(string fileName)
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

            return string.Format("{0}/{1}?size=512x512&type={2}&user={3}", this.domain, fileName, type, this.userName);
        }
    }

    public class DirectoryJsonGenerator
    {
        public string RootFolderId { get; set; }
        private DirectoryInfo rootInfo;
        public Dictionary<string, NodeBase> fileMap = new Dictionary<string, NodeBase>();
        int rootDirLength = 0;

        protected DirectoryJsonGenerator()
        {
        }

        //rootDir: root dir
        public void CreateFileMap(string rootDir)
        {
            this.rootInfo = new DirectoryInfo(rootDir);
            this.rootDirLength = rootInfo.FullName.Length;
            this.RootFolderId = StringHelper.IdGenerate();
            this.CreateFolderHierarchy();
        }

        public virtual string GetThumbnailUrl(string fileName)
        {
            throw new NotImplementedException();
        }

        public virtual string GetPath(string fileFullName)
        {
            return fileFullName.Substring(rootDirLength);
        }

        private void CreateFolderHierarchy()
        {
            var node = new DirNode()
            {
                Id = RootFolderId,
                //根目录显示空不显示用户名称
                Name = "",
                ParentId = "",
            };
            var dirNodes = GetDirNodes(RootFolderId, this.rootInfo);
            var filesNodes = GetFileNodes(RootFolderId, this.rootInfo);
            node.ChildrenCount = dirNodes.Count() + filesNodes.Count();
            node.ChildrenIds = dirNodes.Select(c => c.Id).Union(filesNodes.Select(c => c.Id)).ToArray();
            fileMap.Add(RootFolderId, node);
            foreach (var item in filesNodes)
            {
                fileMap.Add(item.Id, item);
            }
        }


        private FileNode[] GetFileNodes(string parentId, DirectoryInfo dir)
        {
            return dir.GetFiles().Select(c =>
            {
                return new FileNode()
                {
                    Id = StringHelper.IdGenerate(),
                    Name = c.Name,
                    Size = c.Length / 1024 + "KB",
                    Path = GetPath(c.FullName),
                    ModDate = c.LastWriteTime.ToLongDateString(),
                    ParentId = parentId,
                    ThumbnailUrl = GetThumbnailUrl(c.Name),
                };
            }).ToArray();
        }

        private DirNode[] GetDirNodes(string parentId, DirectoryInfo dir)
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
                var childDirNodes = GetDirNodes(node.Id, child);
                var childFileNodes = GetFileNodes(node.Id, child);

                node.ChildrenIds = childDirNodes.Select(c => c.Id).Union(childFileNodes.Select(c => c.Id)).ToArray();
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
        // 文件的实际路径
        public string Path { get; set; }
        public string Size { get; set; }
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
        public int ChildrenCount { get; set; }
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

}