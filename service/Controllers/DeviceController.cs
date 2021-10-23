using System;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http;
using Newtonsoft.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Localization;

namespace Ioliz.Service.Controllers
{
  [Authorize]
  [Route("/api/[controller]/[action]")]
  public class DeviceController : Controller
  {
    private readonly ServiceContext ctx;
    private ILogger<DeviceController> logger;
    private readonly IStringLocalizer localizer;


    public DeviceController(ServiceContext context, ILogger<DeviceController> logger, IStringLocalizer<DeviceController> localizer)
    {
      this.ctx = context;
      this.logger = logger;
      this.localizer = localizer;
    }
    
    public IEnumerable<DeviceModel> MyList()
    {
      return List(User.Identity.Name);
    }

    [HttpPost("/api/device/groupUpdate")]
    public IActionResult GroupUpdate([FromBody] UpdateDeviceNameModel model)
    {
      var ids = model.DeviceId.Split(",".ToCharArray());
      ctx.Devices.AsQueryable().Where(x => ids.Contains(x.DeviceId)).ToList().ForEach(x =>
      {
        x.GroupName = model.GroupName;
      });
      ctx.SaveChanges();
      return Ok("");
    }

    [HttpPost("/api/device/nameUpdate")]
    public IActionResult NameUpdate([FromBody] UpdateDeviceNameModel model)
    {
      var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
      if (device == null) return NotFound("device not found");
      if (device.TenantUserName != User.Identity.Name) new UnauthorizedAccessException();
      if (!string.IsNullOrEmpty(model.NewName))
      {
        device.Name = model.NewName;
      }
      if (!string.IsNullOrEmpty(model.Resolution))
      {
        device.Resolution = model.Resolution;
      }
      if (!string.IsNullOrEmpty(model.LatLng))
      {
        device.LatLng = model.LatLng;
      }
      ctx.SaveChanges();

      var instance = ctx.Instances.FirstOrDefault(x => x.TenantUserName == User.Identity.Name);
      using (HttpClient client = new HttpClient())
      {
        var parameters = new
        {
          UserName = User.Identity.Name,
          DeviceId = model.DeviceId,
          NewName = model.NewName,
          Resolution = model.Resolution
        };

        var url = instance.ApiServer + string.Format("/api/device");
        var content = new System.Net.Http.StringContent(JsonConvert.SerializeObject(parameters), System.Text.Encoding.UTF8, "application/json");
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        logger.LogInformation("instance remote  url:" + url);
        var response = client.PostAsync(url, content).Result;
        if (response.IsSuccessStatusCode)
        {
          return Ok(response);
        }
        else
        {
          var error = response.Content.ReadAsStringAsync().Result;
          logger.LogInformation("instance error=" + error);
          return BadRequest(error);
        }
      }
    }

    //设备分配给会员
    [HttpPost]
    public IActionResult Assign([FromBody] AssignModel model)
    {
      var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
      if (device == null)
      {
        return NotFound(string.Format("deviceid:{0} not found", model.DeviceId));
      }
      if (device.TenantUserName == model.UserName) return Ok();
      device.TenantUserName = model.UserName;
      ctx.SaveChanges();
      return Ok();
    }

    [HttpGet("/api/device/list/{id}")]
    public IEnumerable<DeviceModel> List(string id)
    {
      string userName = id;
      var instance = ctx.Instances.FirstOrDefault(x => x.TenantUserName == userName);
      var q = from c in ctx.Devices
              join b in ctx.Licenses.AsQueryable()
              on c.CurrentLicenseId equals b.Id into sr
              from x in sr.DefaultIfEmpty()
              where c.TenantUserName == userName
              select new DeviceModel()
              {
                DeviceId = c.DeviceId,
                Name = c.Name,
                MAC = c.MAC,
                IP = c.IP,
                ActivationdDate = x.ActivationdDate != null ? x.ActivationdDate.Value : DateTime.Now,
                ValidDays = x.ValidDays,
                TenantUserName = c.TenantUserName,

                GroupName = c.GroupName,
                Resolution = c.Resolution,
                OS = c.OS,
                LatLng = c.LatLng
              };
      var model = q.ToList();

      var url = GetDeviceResourceUrl(instance);
      foreach (var item in model)
      {

        var days = Convert.ToInt32(item.ActivationdDate.AddDays(item.ValidDays ?? 0).Subtract(DateTime.Now).TotalDays);
        if (days <= 0)
        {
          item.licenseExpired = true;
          days = 0;
        }
        item.LicenseRemark = string.Format(localizer.GetString("有效天数{0}天"), Convert.ToInt32(days));
        //item.LicenseRemark = string.Format("valid days:{0}", Convert.ToInt32(days));
        item.StatusResourceUrl = url;
      }

      return model;
    }


    private string GetDeviceResourceUrl(Instance instance)
    {
      if (instance == null) return "";
      var url = string.Format("{0}{1}", instance.ApiServer, AppInstance.Instance.Config.DeviceStatusUrl + User.Identity.Name);
      return url;
    }
    private string GetDeviceStatus(DeviceStatus status)
    {
      if (status == DeviceStatus.Failure)
      {
        return "设备异常";
      }
      else if (status == DeviceStatus.Offline)
      {
        return "设备离线";
      }
      else if (status == DeviceStatus.Running)
      {
        return "设备在线";
      }
      else
      {
        return "未知";
      }

    }

    private void GetLicenseRemark(License license, out bool licenseExpired, out string remark)
    {
      if (license == null)
      {
        licenseExpired = false;
        remark = "设备未授权";
        return;
      }
      var days = license.ActivationdDate.Value.AddDays(license.ValidDays).Subtract(DateTime.Now).TotalDays;
      if (days < 0)
      {
        days = 0;
      }
      remark = string.Format("有效天数{0}天", Convert.ToInt32(days));
      licenseExpired = (days <= 0);
    }

  }
}