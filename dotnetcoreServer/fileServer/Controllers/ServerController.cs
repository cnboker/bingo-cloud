using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FileServer.Models;
using Ioliz.Shared.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace FileServer.Controllers
{
    [Route("/api/[controller]/[action]")]
    [Authorize()]
    public class ServerController : Controller
    {
        private IWebHostEnvironment _hostingEnvironment;
        private string UserBaseDir;
        private string videoTmpDir;
        public ServerController(IWebHostEnvironment hostingEnvironment)
        {
            this._hostingEnvironment = hostingEnvironment;

        }

        private void RequireDirIsCreate()
        {
            this.UserBaseDir = Path.Combine(_hostingEnvironment.WebRootPath, User.Identity.Name);
            if (!System.IO.Directory.Exists(this.UserBaseDir))
            {
                System.IO.Directory.CreateDirectory(this.UserBaseDir);
            }
            //临时目录用于存储上传的视频文件
            this.videoTmpDir = this.UserBaseDir + "/tmp/";
            if (!Directory.Exists(this.videoTmpDir))
            {
                Directory.CreateDirectory(this.videoTmpDir);
            }
        }

        [HttpGet("/api/server")]
        public IActionResult Index()
        {
            RequireDirIsCreate();
            string hostUrl = Request.Scheme + "://" + Request.Host;
            WebDirectory generator = new WebDirectory(hostUrl,User.Identity.Name);
            generator.CreateFileMap(this.UserBaseDir);
            var outputJson = new
            {
                rootFolderId = generator.RootFolderId,
                fileMap = generator.fileMap,
                //bashPath = hostUrl + "/" + User.Identity.Name,
            };
            return Ok(outputJson);
        }

        [HttpPost("/api/server/mkdir")]
        public IActionResult Mkdir([FromBody] ValueModel<string> model)
        {
            try
            {
                var pyDir = this.UserBaseDir + model.Value;
                Console.WriteLine("path" + pyDir);
                if (!Directory.Exists(pyDir))
                {
                    Directory.CreateDirectory(pyDir);
                }
                else
                {
                    return BadRequest("has exists");
                }
            }
            catch (Exception e)
            {
                Console.Write(e.Message);
                return BadRequest(e.Message);
            }
            return Ok();
        }

        [HttpDelete("/api/server/rm")]
        public IActionResult Remove([FromBody] Models.FileInfo[] files)
        {
            foreach (var file in files)
            {
                try
                {
                    var filePath = _hostingEnvironment.WebRootPath + "/" + User.Identity.Name + file.Path;
                    if (file.IsDir)
                    {
                        if (Directory.Exists(filePath))
                        {
                            Directory.Delete(filePath, true);
                        }
                    }
                    else
                    {
                        if (System.IO.File.Exists(filePath))
                        {
                            System.IO.File.Delete(filePath);
                        }
                    }

                }
                catch { }
            }
            return Ok();
        }

        //[RequestSizeLimit(1024 * 1024 * 2000)]
        [DisableRequestSizeLimit]
        [FFMepgFilter]
        [HttpPost("/api/server/upload")]
        public async Task<IActionResult> File([FromForm] IFormFile files)
        {
            RequireDirIsCreate();
            //前缀不包含用户名称(/scott/tmp/test/a.txt,basePath为/tmp/test)
            var prefixPath = Request.Headers["basePath"];
            //浏览器选择的当前目录
            var fileUploadDir = this.UserBaseDir + prefixPath[0];
            var isVideo = IsMediaFile(files.FileName);
            FileResultModel result = new FileResultModel() { };
            if (isVideo)
            {
                result = await VideoFileHandle(fileUploadDir, files);
            }
            else
            {
                result = await ImageFileHandle(fileUploadDir, files);
            }
            return Json(result);
        }

        //fileUploadDir:用户指定上传目录
        private async Task<FileResultModel> VideoFileHandle(string fileUploadDir, IFormFile files)
        {
            if (files.Length > 0)
            {
                using (var stream = new FileStream(this.videoTmpDir + files.FileName, FileMode.Create))
                {
                    await files.CopyToAsync(stream);
                }
            }
            string hostUrl = Request.Scheme + "://" + Request.Host;
            string fileName = files.FileName.Substring(0, files.FileName.IndexOf(".")) + ".mp4";
            WebDirectory webDir = new WebDirectory(hostUrl,User.Identity.Name);
            return new FileResultModel()
            {
                FileName = fileName,
                //只有上传的是视频文件的时候才会用
                FullUrl = hostUrl + "/" + User.Identity.Name + "/tmp/" + files.FileName,
                SavePath = fileUploadDir + "/" + fileName,
                ThumbnailUrl = webDir.GetThumbnailUrl(files.FileName)
            };
        }

        private async Task<FileResultModel> ImageFileHandle(string fileUploadDir, IFormFile files)
        {
            string hostUrl = Request.Scheme + "://" + Request.Host;
            if (files.Length > 0)
            {
                using (var stream = new FileStream(fileUploadDir + "/" + files.FileName, FileMode.Create))
                {
                    await files.CopyToAsync(stream);
                }
            }
            WebDirectory webDir = new WebDirectory(hostUrl,User.Identity.Name);
            return new FileResultModel()
            {
                FileName = files.FileName,
                ThumbnailUrl = webDir.GetThumbnailUrl(files.FileName)
            };
        }

        static string[] mediaExtensions = {
        ".WEBM", ".MPG", ".MP2", ".MPEG",  ".OGG", ".MPE", //etc
        ".AVI", ".MP4", ".DIVX", ".WMV", ".MPV", "M4V", ".MOV", ".FLV" //etc
        };

        static public bool IsMediaFile(string path)
        {
            Console.WriteLine("Path.GetExtension(path).ToUpperInvariant()=" + Path.GetExtension(path).ToUpperInvariant());
            return -1 != Array.IndexOf(mediaExtensions, Path.GetExtension(path).ToUpperInvariant());
        }
    }
}