using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Ioliz.Service.Controllers {
  [Route ("/api/[controller]/[action]")]
  public class OTAController : Controller {
    private IWebHostEnvironment _hostingEnvironment;
    public OTAController (IWebHostEnvironment hostingEnvironment) {
      this._hostingEnvironment = hostingEnvironment;
    }

    // [HttpGet ("/api/ota/default")]
    // public IActionResult Default () {
    //   var files = Get5Files ();
    //   if (files.Length == 0) {
    //     return BadRequest ("OTA file not exist!");
    //   }
    //   var path = AppInstance.Instance.Config.Domain + "ota/" + files[0];
    //   return new ContentResult () { Content = path };
    // }

    [HttpGet ("/api/ota/{id}/{model}")]
    public IActionResult Index (string id,string model) {
      string file = Path.Combine (_hostingEnvironment.WebRootPath, "ota", id + "_" + model + ".json");
      if (!System.IO.File.Exists (file)) {
        return BadRequest ("type is not exist");
      }
      using (StreamReader sr = new StreamReader (file)) {
        var content = sr.ReadToEnd ();
        return Json (JsonConvert.DeserializeObject(content));
      }
    }

    [HttpGet ("/api/ota/files")]
    public IActionResult List () {
      var files = Get5Files ();
      return new JsonResult (files);
    }

    private string[] Get5Files () {
      string contentRootPath = Path.Combine (_hostingEnvironment.WebRootPath, "ota");
      DirectoryInfo info = new DirectoryInfo (contentRootPath);
      return info.GetFiles ().OrderByDescending (p => p.CreationTime).Take (5).Select (c => c.Name).ToArray ();
    }

    [HttpDelete ("/api/ota/remove/{fileName}")]
    public IActionResult Remove (string fileName) {
      if (string.IsNullOrEmpty (fileName)) {
        return BadRequest ("file is not null");
      }

      string file = Path.Combine (_hostingEnvironment.WebRootPath, "ota", fileName);
      if (System.IO.File.Exists (file)) {
        System.IO.File.Delete (file);
      }
      return Ok ();
    }

    public class PostForm {
      public string Type;
      public string MD5;
      public string Version;
      public string File;
      //主板型号
      public string Model;
    }

    [HttpPost ("/api/ota/post")]
    public IActionResult Post ([FromBody] PostForm data) {
      Console.WriteLine ("data", data.Type);
      if (string.IsNullOrEmpty (data.Type)) {
        return BadRequest ("type is empty");
      }
      var path = this._hostingEnvironment.WebRootPath;
      var typeFile = Path.Combine (path, "ota", data.Type + "_" + data.Model +  ".json");
      if(System.IO.File.Exists(typeFile)){
        try{
          System.IO.File.Delete(typeFile);
        }catch{

        }
      }
      using (StreamWriter sw = new StreamWriter (typeFile,false)) {
        var content = JsonConvert.SerializeObject (data);
        sw.Write (content);
        sw.Close();
      }
      return Ok ();
    }

    [HttpPost ("/api/ota/fileupload")]
    public async Task<IActionResult> File ([FromForm] IFormFile file) {
      var path = this._hostingEnvironment.WebRootPath;
      var otaPath = Path.Combine (path, "ota");
      if (!Directory.Exists (otaPath)) {
        Directory.CreateDirectory (otaPath);
      }
      if (file.Length > 0) {

        using (var stream = new FileStream (Path.Combine (otaPath, file.FileName), FileMode.Create)) {
          await file.CopyToAsync (stream);
        }
      }
      // process uploaded files
      // Don't rely on or trust the FileName property without validation.

      return Content (AppInstance.Instance.Config.Domain + "ota/" + file.FileName);
    }
  }
}