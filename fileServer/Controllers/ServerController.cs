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
      string dir = Path.Combine(_hostingEnvironment.WebRootPath, User.Identity.Name);
      if (!System.IO.File.Exists(dir))
      {
        System.IO.Directory.CreateDirectory(dir);
      }
      DirectoryJsonGenerator generator = new DirectoryJsonGenerator(dir);
      generator.CreateFolderHierarchy();
      foreach (var node in generator.fileMap.Values)
      {
        node.ThumbnailUrl = !string.IsNullOrEmpty(node.ThumbnailUrl) ? AppInstance.Instance.Config.Domain + User.Identity.Name + node.ThumbnailUrl : "";
      }
      var outputJson = new
      {
        rootFolderId = generator.RootFolderId,
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
    public IActionResult Remove([FromBody] string[] fileNames)
    {
      foreach (var file in fileNames)
      {
        try
        {

          var filePath = _hostingEnvironment.WebRootPath + "/" + User.Identity.Name + file;
          if (Directory.Exists(filePath))
          {
            Directory.Delete(filePath, true);
          }
          //Console.WriteLine("file path=" + _hostingEnvironment.WebRootPath + User.Identity.Name +  file);
          if (System.IO.File.Exists(filePath))
          {
            System.IO.File.Delete(filePath);
          }

        }
        catch { }
      }
      return Ok();
    }


    [HttpPost("/api/server/upload")]
    public async Task<IActionResult> File([FromForm] IFormFile files)
    {
      var prefixPath = Request.Headers["basePath"];

      Console.WriteLine("prefixPath=" + JsonConvert.SerializeObject(prefixPath));
      var path = this._hostingEnvironment.WebRootPath;
      var savePath = path + "/" + User.Identity.Name + prefixPath[0];
      Console.WriteLine("save path", savePath);
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
      // process uploaded files
      // Don't rely on or trust the FileName property without validation.
      var vPath = AppInstance.Instance.Config.Domain + User.Identity.Name + prefixPath[0] + "/";
      var result = new
      {
        path = vPath + files.FileName,
        fileName = files.FileName
      };
      return Json(result);
    }
  }
}