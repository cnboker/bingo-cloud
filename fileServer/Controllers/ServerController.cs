using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
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

        public ServerController(IWebHostEnvironment hostingEnvironment)
        {
            this._hostingEnvironment = hostingEnvironment;
        }

        [HttpGet("/api/server")]
        public IActionResult Index()
        {
            //Console.WriteLine("_hostingEnvironment.WebRootPath=" + _hostingEnvironment.WebRootPath);
            string dir = Path.Combine(_hostingEnvironment.WebRootPath, User.Identity.Name);
            if (!System.IO.Directory.Exists(dir))
            {
                System.IO.Directory.CreateDirectory(dir);
            }
            DirectoryJsonGenerator generator = new DirectoryJsonGenerator(dir,User.Identity.Name);
            generator.CreateFolderHierarchy();
            string hostUrl = Request.Scheme + "://" + Request.Host;
            // foreach (var node in generator.fileMap.Values)
            // {
            //     node.ThumbnailUrl = !string.IsNullOrEmpty(node.ThumbnailUrl) ? hostUrl + User.Identity.Name + node.ThumbnailUrl : null;
            //     node.Path = !string.IsNullOrEmpty(node.Path) ? hostUrl + User.Identity.Name + node.Path : "";
            // }
            var outputJson = new
            {
                rootFolderId = generator.RootFolderId,
                bashPath = hostUrl + "/" + User.Identity.Name,
                fileMap = generator.fileMap
            };
            return Json(outputJson);
        }

        [HttpPost("/api/server/mkdir")]
        public IActionResult Mkdir([FromBody] ValueModel<string> model)
        {
            string rootDir = Path.Combine(_hostingEnvironment.WebRootPath, User.Identity.Name);
            try
            {
                var pyDir = rootDir + model.Value;
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
        public IActionResult Remove([FromBody] FileInfo[] files)
        {
            foreach (var file in files)
            {
                try
                {
                    if (file.Path.IndexOf("/" + User.Identity.Name + "/") == -1)
                    {
                        return BadRequest("Illegal operation");
                    }
                    var filePath = _hostingEnvironment.WebRootPath + file.Path;
                    Console.WriteLine("filePath=" + filePath);
                    if (file.IsDir)
                    {
                        if (Directory.Exists(filePath))
                        {
                            Directory.Delete(filePath, true);
                        }
                    }
                    else
                    {
                        //Console.WriteLine("file path=" + _hostingEnvironment.WebRootPath + User.Identity.Name +  file);
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
        [HttpPost("/api/server/upload")]
        public async Task<IActionResult> File([FromForm] IFormFile files)
        {
            var prefixPath = Request.Headers["basePath"];

            //Console.WriteLine("prefixPath=" + JsonConvert.SerializeObject(prefixPath));
            var path = this._hostingEnvironment.WebRootPath;
            var savePath = path + prefixPath[0];
            //Console.WriteLine("save path=" + savePath);
            if (!Directory.Exists(savePath))
            {
                Directory.CreateDirectory(savePath);
            }
            if (files.Length > 0)
            {

                using (var stream = new FileStream(Path.Combine(savePath, files.FileName), FileMode.Create))
                {
                    await files.CopyToAsync(stream);
                }
            }
            string hostUrl = Request.Scheme + "://" + Request.Host;
            // process uploaded files
            // Don't rely on or trust the FileName property without validation.
            //path = files.FileName;
            var result = new
            {
                path = "/" + files.FileName,
                fileName = files.FileName,
                ThumbnailUrl =  DirectoryJsonGenerator.GetThumbnailUrl(files.FileName, User.Identity.Name)
            };
            return Json(result);
        }
    }
}