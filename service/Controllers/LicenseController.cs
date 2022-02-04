
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using System;

namespace Ioliz.Service.Controllers
{

  [Route("/api/[controller]/[action]")]
  [Authorize]
  public class LicenseController : BaseController
  {

    public LicenseController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {
    }


    //设备获取二维码链接
    [HttpPost]
    public ApiResult PostDeviceInfo([FromForm] Device model)
    {
       Console.WriteLine("UploadDeviceInfo,deviceId=" + model.DeviceId);
      // if (ctx.Devices.Any(x => x.MAC == model.MAC)) 
      var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
      if (device != null)
      {

        if (device.UserName.ToLower() != User.Identity.Name.ToLower() && device.AuthorizeStatus == AuthorizeStatus.Allow)
        {
          return new ApiResult() { Result = 500, Message = string.Format("请使用账号{0}进行授权", device.UserName) };
        }
        logger.LogInformation("update data" + User.Identity.Name);
        device.AuthorizeCode = model.AuthorizeCode;
        device.LastUpdateTime = DateTime.Now;
        device.AuthorizeStatus = AuthorizeStatus.Initail;
        device.UserName = User.Identity.Name;
      }
      else
      {
        model.UserName = User.Identity.Name;
        model.AuthorizeStatus = AuthorizeStatus.Initail;
        model.UpdateDate = DateTime.Now;
        ctx.Devices.Add(model);
      }

      ctx.SaveChanges();
      // logger.LogInformation("devices count=" + ctx.Devices.Count());
      logger.LogInformation("UploadDeviceInfo,MAC=" + model.MAC);
      logger.LogInformation("UploadDeviceInfo,deviceId=" + model.DeviceId);
      logger.LogInformation("UploadDeviceInfo,authorizeCode=" + model.AuthorizeCode);
      return new ApiResult() { Message = "ok" };
    }

    //urlAuthorizeCode=sessionid为Url授权代码，系统找到当前用户的设备信息列表， 同时比较设备信息授权代码和urlAuthorizeCode一样的
    //实体，如果一样则说明是待授权设备，用户可以点击授权按钮做授权或拒绝授权操作
    [HttpGet("/api/license/unAuthorizedList")]
    public IEnumerable<Device> UnAuthorizedList()
    {
      var devices = ctx.Devices.AsQueryable().Where(x => x.UserName == User.Identity.Name && x.AuthorizeStatus == 0).ToList();
      return devices;
    }

    [HttpPost]
    //用户为设备授权
    public IActionResult Authorize([FromBody] AuthorizeModel model)
    {
      logger.LogInformation("DeviceAuthorize,model,deviceid=" + model.DeviceId);

      var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
      if (device == null)
      {
        return BadRequest("设备不存在");
      }
      //代理商账号不允许激活设备
      if (IsAgent())
      {
        return BadRequest("代理商账号不允许激活设备,请使用代理商租户账号激活设备.");
      }

      var instance = ctx.Instances.FirstOrDefault(x => x.UserName == User.Identity.Name);
      if (instance == null)
      {
        return BadRequest("实例不存在，请先创建实例");
      }
      License license = null;

      if (device.UserName.ToLower() != User.Identity.Name.ToLower())
      {
        return BadRequest("授权用户和设备绑定账号不匹配");
      }

      license = ctx.Licenses.FirstOrDefault(x => x.Status == LicenseStatus.Active);

      if (license != null)
      {
        var days = Convert.ToInt32(license.ActivationdDate.Value.AddDays(license.ValidDays).Subtract(DateTime.Now).TotalDays);
        //if (license.ActivationdDate.Value.AddDays(license.ValidDays) > DateTime.Now)
        if (days > 0)
        {
          return Ok(CreateDeviceModel(license));
        }
        else
        {
          license.Status = LicenseStatus.Expired;
          ctx.SaveChanges();
        }
      }
      var user = User.Identity.Name;
      //获取未激活证书
      //license = ctx.Licenses.AsQueryable().FromSql($"select * from licenses where UserName={user} and Status=0 ").FirstOrDefault();
      license = ctx.Licenses.AsQueryable().Where(c => c.UserName == user && c.Status == 0).FirstOrDefault();
      // license = ctx.Licenses.FirstOrDefault(x =>
      //   x.UserName == User.Identity.Name &&
      //   x.Status == LicenseStatus.InActive 
      // );
      if (license == null)
      {
        return BadRequest("激活失败，没有可用许可");
      }
      license.DeviceId = model.DeviceId;
      license.ActivationdDate = DateTime.Now;

      license.Status = LicenseStatus.Active;

      device.AuthorizeDate = DateTime.Now;
      device.AuthorizeStatus = AuthorizeStatus.Allow;
      ctx.SaveChanges();
      return Ok(CreateDeviceModel(license));
    }
    private DeviceModel CreateDeviceModel(License license)
    {
      var c = ctx.Devices.FirstOrDefault(c => c.DeviceId == license.DeviceId);
      var leftDays = Convert.ToInt32(license.ActivationdDate.Value.AddDays(license.ValidDays).Subtract(DateTime.Now).TotalDays);
      var model = new DeviceModel()
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
        LicenseRemark = string.Format("valid days:{0}", leftDays),
        NetworkStatus = (int)c.Status
      };
      return model;
    }
    
  }
}