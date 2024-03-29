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
using Microsoft.Extensions.Logging;

namespace FileServer.Controllers
{
    [Route("/api/[controller]/[action]")]
    [Authorize()]
    public class ServerController : Controller
    {

        private IWebHostEnvironment _hostingEnvironment;
        private string UserBaseDir;
        private string videoTmpDir;
        //上传文件虚拟路径， 比如上传目录是/root/images, 那么虚拟路径就是 images
        private string prefixPath;
        public BackgroundWorkQuenue backgroundWorkQuenue;
        public ILogger<ServerController> logger;
        public ServerController(IWebHostEnvironment hostingEnvironment,
        BackgroundWorkQuenue backgroundWorkQuenue,
        ILogger<ServerController> logger
        )
        {
            this._hostingEnvironment = hostingEnvironment;
            this.backgroundWorkQuenue = backgroundWorkQuenue;
            this.logger = logger;
        }

        private void RequireDirIsCreate()
        {
            Console.WriteLine("_hostingEnvironment.WebRootPath=" + _hostingEnvironment.WebRootPath);
            this.UserBaseDir = Path.Combine(_hostingEnvironment.WebRootPath, User.Identity.Name);
            if (!System.IO.Directory.Exists(this.UserBaseDir))
            {
                System.IO.Directory.CreateDirectory(this.UserBaseDir);
            }
            //临时目录用于存储上传的视频文件
            this.videoTmpDir = this.UserBaseDir + Contants.TmpDir;
            CreateDir(this.videoTmpDir);
            CreateDir(this.UserBaseDir + Contants.DocDir);
            CreateDir(this.UserBaseDir + Contants.VideoDir);
            CreateDir(this.UserBaseDir + Contants.ImageDir);
            CreateDir(this.UserBaseDir + Contants.IPADir);
        }

        private void CreateDir(string dir)
        {
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }

        [HttpGet("/api/server")]
        public IActionResult Index()
        {
            RequireDirIsCreate();
            string hostUrl = Request.Scheme + "://" + Request.Host;
            WebDirectory generator = new WebDirectory(hostUrl, User.Identity.Name);
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
                    var filePath = _hostingEnvironment.WebRootPath + "/" + User.Identity.Name + "/" + file.Path;
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

        [AllowAnonymous]
        [FFMepgFilter]
        [H264Filter]
        public async Task<IActionResult> FilterTest(){
            Console.WriteLine("FilterTest....");
            FileResultModel result = new FileResultModel() {  };
            return Json(result);
        }

        [RequestSizeLimit(1024 * 1024 * 500)]
        //[DisableRequestSizeLimit]
        [FFMepgFilter]
        [H264Filter]
        [HttpPost("/api/server/upload")]
        public async Task<IActionResult> File([FromForm] IFormFile files)
        {
            RequireDirIsCreate();
            //前缀不包含用户名称(/scott/tmp/test/a.txt,basePath为/tmp/test)
            this.prefixPath = Request.Headers["basePath"].ToString();
            Console.WriteLine("prefixPath=" + prefixPath);
            //ObjectDumper.Dump(files);
            //浏览器选择的当前目录
            var fileUploadDir = this.UserBaseDir + "/" + prefixPath + "/";
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

        //fileUploadDir:浏览器选择的当前目录
        private async Task<FileResultModel> VideoFileHandle(string fileUploadDir, IFormFile files)
        {
            var tmpSavePath = this.videoTmpDir + files.FileName;
            if (files.Length > 0)
            {
                using (var stream = new FileStream(tmpSavePath, FileMode.Create))
                {
                    await files.CopyToAsync(stream);
                }
            }
            string hostUrl = Request.Scheme + "://" + Request.Host;
            string fileName = files.FileName.Substring(0, files.FileName.IndexOf(".")) + ".mp4";
            WebDirectory webDir = new WebDirectory(hostUrl, User.Identity.Name);
            return new VideoFileResultModel()
            {
                FileName = fileName,
                TmpPath = tmpSavePath,
                //只有上传的是视频文件的时候才会用
                TmpUrl = hostUrl + "/" + User.Identity.Name + Contants.TmpDir + files.FileName,
                SavePath = fileUploadDir + "/" + fileName,
                Path = string.Format("{0}/{1}/{2}/{3}", hostUrl, User.Identity.Name, prefixPath, files.FileName),
                //视频文件放到.tmp文件夹，所有这里临时从.tmp文件截图
                ThumbnailUrl = webDir.GetThumbnailUrl(Contants.TmpDir, files.FileName),
                ThumbnailUrl1 = webDir.GetThumbnailUrl(prefixPath, files.FileName),
            };
        }

        private async Task<FileResultModel> ImageFileHandle(string fileUploadDir, IFormFile files)
        {
            string hostUrl = Request.Scheme + "://" + Request.Host;
            string filePath = fileUploadDir + "/" + files.FileName;
            if (files.Length > 0)
            {
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await files.CopyToAsync(stream);
                }
                //如果图片尺寸大于2k则缩小到2k
                ImageUtil.Resize(filePath);
            }
            WebDirectory webDir = new WebDirectory(hostUrl, User.Identity.Name);
            return new FileResultModel()
            {
                FileName = files.FileName,
                Path = string.Format("{0}/{1}/{2}/{3}", hostUrl, User.Identity.Name, prefixPath, files.FileName),
                ThumbnailUrl = webDir.GetThumbnailUrl(this.prefixPath, files.FileName)
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