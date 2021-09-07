//t-sql 分页接口
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace Ioliz.Service.Controllers
{
  [Authorize]
  [Route("/api/[controller]/[action]")]
  public class FileController : BaseController
  {
    private IWebHostEnvironment _hostingEnvironment;
    public FileController(ServiceContext context, ILogger<Sensor2Controller> logger, IWebHostEnvironment hostingEnvironment
   ) : base(context, logger)
    {
      this._hostingEnvironment = hostingEnvironment;
    }

    [HttpPost("/api/file/upload")]
    public async Task<IActionResult> File([FromForm] IFormFile file)
    {
      var path = this._hostingEnvironment.WebRootPath;
      var filePath = Path.Combine(path, "uploadfiles");
      if (!Directory.Exists(filePath))
      {
        Directory.CreateDirectory(filePath);
      }
      var subDir = Path.Combine(filePath, DateTime.Now.ToString("yyyyMM"));
      if (!Directory.Exists(subDir))
      {
        Directory.CreateDirectory(subDir);
      }
     
      var newFileName = file.FileName.Insert(file.FileName.IndexOf("."), "_" + DateTime.Now.Ticks);
      
      if (file.Length > 0)
      {
        using (var stream = new FileStream(Path.Combine(subDir, newFileName), FileMode.Create))
        {
          await file.CopyToAsync(stream);
        }
      }
      // process uploaded files
      // Don't rely on or trust the FileName property without validation.
      return Json(new
      {
        server = AppInstance.Instance.Config.Domain,
        path = "uploadfiles/" + DateTime.Now.ToString("yyyyMM") + "/" + newFileName
      });
    }

  }
}