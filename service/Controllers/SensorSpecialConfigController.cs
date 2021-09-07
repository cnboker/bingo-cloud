using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Ioliz.Service.Controllers
{


  [Authorize]
  [Route("/api/[controller]/[action]")]
  public class SensorSpecialConfigController : BaseController
  {
    public SensorSpecialConfigController(ServiceContext context, ILogger<SensorSpecialConfigController> logger)
  : base(context, logger)
    {

    }
  
    [HttpGet("/api/sensorConfig/{group}")]
    public dynamic Config(string group)
    {
      var gs = group.Split(",".ToArray());
      var list = ctx.SensorSpecialConfigs.AsQueryable().Where(p =>
        p.UserName == User.Identity.Name &&
        gs.Contains(p.Group)
      ).ToArray();
      return list;
    }

    [HttpPost("/api/sensorConfig/update")]
    public IActionResult Update([FromBody] SensorSpecialConfigModel model)
    {
      var obj = ctx.SensorSpecialConfigs.FirstOrDefault(p =>
        p.UserName == User.Identity.Name &&
        p.Group == model.Group
      );
      if (obj == null)
      {
        ctx.SensorSpecialConfigs.Add(new SensorSpecialConfig()
        {
          UserName = User.Identity.Name,
          Group = model.Group,
          Content = model.Content
        });
      }
      else
      {
        obj.Content = model.Content;
      }
      ctx.SaveChanges();
      return Json("Ok");
    }
  }
}