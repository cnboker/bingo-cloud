using System;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Localization;
using Ioliz.Shared.Utils;

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

        [HttpGet("/api/device/activateCode")]
        public string ActivateCode(){
            return StringHelper.GetRandom(6);
        }

        [HttpGet("/api/device/status")]
        public IActionResult MyDevicesStatus()
        {
            var deviceIds = ctx.Devices.AsQueryable()
            .Where(c => c.UserName == User.Identity.Name)
            .Select(c => c.DeviceId).ToArray();
            return Json(DeviceStateMemoryCache.Get(deviceIds));
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
        public IActionResult HeartBeat(string id)
        {
            DeviceStateMemoryCache.Update(id);
            //update database
            var  now = DateTime.Parse(DateTime.Now.ToShortDateString());
            var entity = ctx.DeviceLiveRecords.FirstOrDefault(c=>c.UpdateDate == now);
            if(entity == null){
                ctx.DeviceLiveRecords.Add(new DeviceLiveRecord(){
                   DeviceId = id,
                   UpdateDate = now,
                   LiveCount = 1
                });
            }else{
                entity.LiveCount += 1;
            }
            ctx.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("/api/device/list/{id}")]
        public IEnumerable<DeviceModel> List(string id)
        {
            string userName = id;
            var q = from c in ctx.Devices
                    join b in ctx.Licenses.AsQueryable()
                    on c.CurrentLicenseId equals b.Id into sr
                    from x in sr.DefaultIfEmpty()
                    where c.UserName == userName
                    select new DeviceModel()
                    {
                        DeviceId = c.DeviceId,
                        Name = c.Name,
                        MAC = c.MAC,
                        IP = c.IP,
                        ActivationdDate = x.ActivationdDate != null ? x.ActivationdDate.Value : DateTime.Now,
                        ValidDays = x.ValidDays,
                        UserName = c.UserName,
                        GroupName = c.GroupName,
                        Resolution = c.Resolution,
                        OS = c.OS,
                        LatLng = c.LatLng
                    };
            var model = q.ToList();
            foreach (var item in model)
            {

                var days = Convert.ToInt32(item.ActivationdDate.AddDays(item.ValidDays ?? 0).Subtract(DateTime.Now).TotalDays);
                if (days <= 0)
                {
                    item.licenseExpired = true;
                    days = 0;
                }
                item.LicenseRemark = string.Format(localizer.GetString("{0}/{1}"), days, item.ValidDays);

            }
            return model;
        }

        int? GetLeftDays(License item)
        {
            if (item == null) return 0;
            return Convert.ToInt32(item.ActivationdDate.Value.AddDays(item.ValidDays).Subtract(DateTime.Now).TotalDays);
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