using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using OfficeOpenXml;
using Dapper;
using Ioliz.Service.Models;
using System.Text;
using System.Data;

namespace Ioliz.Service.Controllers
{
  [Route("/api/[controller]/[action]")]
  public class SIMController : BaseController
  {


    private IWebHostEnvironment _hostingEnvironment;
    public SIMController(ServiceContext context, ILogger<SIMController> logger, IWebHostEnvironment host) : base(context, logger)
    {
      this._hostingEnvironment = host;
    }

    [HttpGet("/api/sim/unbindlist")]
    [Authorize(Roles = "Administrators")]
    public async Task<ActionResult<string[]>> UnbindList()
    {
      if(!IsAdmin()){
        return new string[]{};
      }
      var db = ctx.SIMInfos.AsQueryable().Where(c => !c.IsBinding).Select(c=>c.ICCID).AsQueryable();
      return await db.ToArrayAsync();
    }

    [HttpPost("/api/sim/bind/{sensorid}/{iccid}")]
    [Authorize(Roles = "Administrators")]
    public IActionResult Bind(string sensorId, string iccid)
    {
      var sim = ctx.SIMInfos.FirstOrDefault(k => k.ICCID == iccid);
      if (sim == null)
      {
        return BadRequest(iccid + " not found!");
      }
      var sqlText = @"
        update tbl_messages
        set sim=@iccid
        where topic=@sensorId
       ";
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Execute(sqlText, new
        {
          iccid = iccid,
          sensorId = "SENSORS/" + sensorId
        });
      }

      sim.IsBinding = true;
      ctx.SaveChanges();

      return Ok();
    }

    [HttpPost("/api/sim/unbind/{sensorid}/{iccid}")]
    [Authorize(Roles = "Administrators")]
    public IActionResult UnBind(string sensorId, string iccid)
    {
      var sim = ctx.SIMInfos.FirstOrDefault(k => k.ICCID == iccid);
      if (sim == null)
      {
        return BadRequest(iccid + " not found!");
      }
      var sqlText = @"
        update tbl_messages
        set sim= null
        where topic=@sensorId
       ";
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Execute(sqlText, new
        {
          iccid = iccid,
          sensorId = "SENSORS/" + sensorId
        });
      }

      sim.IsBinding = false;
      ctx.SaveChanges();

      return Ok();
    }

    [HttpGet("/api/sim")]
    [Authorize(Roles = "Administrators")]
    public async Task<ActionResult<SIMInfo[]>> List()
    {
      var db = ctx.SIMInfos.AsQueryable();
      return await db.ToArrayAsync();
    }

    [HttpPost("/api/sim/fileupload")]
    public async Task<IActionResult> File([FromForm] IFormFile file)
    {
      var path = this._hostingEnvironment.WebRootPath;
      var simPath = Path.Combine(path, "sim");
      if (!Directory.Exists(simPath))
      {
        Directory.CreateDirectory(simPath);
      }
      if (file.Length > 0)
      {
        var targetFile = Path.Combine(simPath, file.FileName);
        using (var stream = new FileStream(targetFile, FileMode.Create))
        {
          await file.CopyToAsync(stream);
          try
          {
            databaseSave(targetFile);
          }
          catch (Exception ex)
          {
            return BadRequest(ex.Message);
          }
        }
      }
      return Ok();
    }

    private void databaseSave(string file)
    {
      logger.LogInformation("file name=" + file);
      using (var package = new ExcelPackage(new FileInfo(file)))
      {
        var firstSheet = package.Workbook.Worksheets["Sheet1"];
        var index = 4;
        var ICCID = firstSheet.Cells["C" + index].Text;
        if (ctx.SIMInfos.Any(c => c.ICCID == ICCID))
        {
          throw new ApplicationException("数据已存在");
        }
        StringBuilder sb = new StringBuilder();
        while (ICCID.Length == 13)
        {
          string customerName = firstSheet.Cells["A" + index].Text;
          string number = firstSheet.Cells["B" + index].Text;
          ICCID = firstSheet.Cells["C" + index].Text;
          if (string.IsNullOrEmpty(ICCID))
          {
            break;
          }
          string name = firstSheet.Cells["D" + index].Text;
          string price = firstSheet.Cells["E" + index].Text;
          string payMonth = firstSheet.Cells["F" + index].Text;
          string total = firstSheet.Cells["G" + index].Text;
          sb.AppendFormat("insert into siminfos (CustomerName, Number, ICCID,Name,Price,PayMonth,Total,UploadDate,IsBinding) values ('{0}','{1}','{2}','{3}',{4},{5},{6},getdate(),0)\n",
          customerName, number.Trim(), ICCID, name, price, payMonth, total
            );
          index++;
        }
        logger.LogInformation(sb.ToString());

        using (System.Data.IDbConnection db = MemberConnection)
        {
          db.Execute(sb.ToString());
        }

      }

    }
  }
}