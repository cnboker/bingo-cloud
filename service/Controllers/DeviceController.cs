using System;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
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
      return Ok();
    }

    [HttpPost("/api/device/updateName")]
    public IActionResult UpdateName([FromBody] UpdateDeviceNameModel model)
    {
      var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
      if (device == null) return NotFound("device not found");
      if (device.UserName != User.Identity.Name) new UnauthorizedAccessException();
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

      return Ok(device);

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
      if (device.UserName == model.UserName) return Ok();
      device.UserName = model.UserName;
      ctx.SaveChanges();
      return Ok();
    }

    [HttpGet("/api/heartbeat/{id}")]
    public IActionResult HeartBeat(string id){
      return Ok();
    }

    [HttpGet("/api/device/list/{id}")]
    public IEnumerable<DeviceModel> List(string id)
    {
      string userName = id;
      var instance = ctx.Instances.FirstOrDefault(x => x.UserName == userName);
      var license = ctx.Licenses.FirstOrDefault(x => x.UserName == userName && x.Status == LicenseStatus.Active);
      var leftDays = GetLeftDays(license);
      var q = ctx.Devices.AsQueryable().Where(c => c.UserName == userName).Select(c =>
        new DeviceModel()
        {
          DeviceId = c.DeviceId,
          Name = c.Name,
          MAC = c.MAC,
          IP = c.IP,
          ActivationdDate = license != null ? license.ActivationdDate.Value : DateTime.Now,
          ValidDays = license != null ? license.ValidDays : 0,
          UserName = c.UserName,
          GroupName = c.GroupName,
          Resolution = c.Resolution,
          licenseExpired = leftDays <= 0,
          OS = c.OS,
          LatLng = c.LatLng,
          LicenseRemark = string.Format(localizer["valid days for {0}"], leftDays ?? 0),
          NetworkStatus = (int)c.Status
        });
      var model = q.ToList();
      return model;
    }

    int? GetLeftDays(License item)
    {
      if (item == null) return 0;
      return Convert.ToInt32(item.ActivationdDate.Value.AddDays(item.ValidDays).Subtract(DateTime.Now).TotalDays);
    }

    private string GetDeviceStatus(NetworkStatus status)
    {
      if (status == NetworkStatus.Offline)
      {
        return localizer["Offline"];
      }
      else if (status == NetworkStatus.Running)
      {
        return localizer["Online"];
      }
      else
      {
        return localizer["Unkonwn"];
      }

    }

    private void GetLicenseRemark(License license, out bool licenseExpired, out string remark)
    {
      if (license == null)
      {
        licenseExpired = false;
        remark = localizer["The device is not authorized"];
        return;
      }
      var days = license.ActivationdDate.Value.AddDays(license.ValidDays).Subtract(DateTime.Now).TotalDays;
      if (days < 0)
      {
        days = 0;
      }
      remark = string.Format(localizer["valid days for {0}"], Convert.ToInt32(days));
      licenseExpired = (days <= 0);
    }

  }
}