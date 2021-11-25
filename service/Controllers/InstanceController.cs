
using System;
using System.Collections.Generic;
using System.Linq;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;


namespace Ioliz.Service.Controllers {

    [Route ("/api/[controller]/[action]")]
    [Authorize]
    public class InstanceController : BaseController {
        public InstanceController (ServiceContext ctx, ILogger<BaseController> logger) : base (ctx, logger) { }

        [Route ("/api/instances")]
        public List<Instance> GetServerInstances ([FromBody] string server) {
            return ctx.Instances.AsQueryable().Where (x => x.FileServer == server).ToList ();
        }

        [Route ("/api/instance")]
        //获取可用实例
        public InstanceModel GetInstance () {
            InstanceModel model = new InstanceModel ();

            var userName = User.Identity.Name;
            var instance = ctx.Instances.FirstOrDefault (x => x.UserName == userName);
            var config = AppInstance.Instance.Config;
            model.TrialCount = config.TrialMaxDeviceCount;

            if (instance != null) {
                // model.InstanceAvailiable = true;
                model.CreateDate = instance.CreateDate;
                model.Server = instance.FileServer;
                model.IsTrial = instance.IsTrial;
            }

            var orders = ctx.Orders.AsQueryable().Where (x => x.UserName == userName);
            model.IsPaid = orders.Any (x => x.IsPaid);
            if (model.IsPaid) {
                model.IsCreateService = true;
            } else {
                model.IsCreateService = orders.Any ();
            }

            List<License> licenses = null;
            if (model.IsPaid) {
                licenses = ctx.Licenses.AsQueryable()
                    .Where (x => x.UserName == userName && x.LicenseType == LicenseType.Formal)
                    .ToList ();
                model.WillExpiredCount = licenses.Where (x => x.Status == LicenseStatus.Active &&
                    x.ActivationdDate.Value.AddDays (x.ValidDays).Subtract (DateTime.Now).TotalDays < 15).Count ();
            }

            if (model.IsTrial) {
                licenses = ctx.Licenses.AsQueryable()
                    .Where (x => x.UserName == userName && x.LicenseType == LicenseType.Trial)
                    .ToList ();
            }

            if (licenses != null) {
                model.LicenseCount = licenses.Count ();
                model.AvailiableLicenseCount = licenses.Count (x => !x.ActivationdDate.HasValue);
                model.UsedLicenseCount = model.LicenseCount - model.AvailiableLicenseCount;
            }

            return model;
        }

        private void TrialLicenseCreate () {
            var config = AppInstance.Instance.Config;
         
            //create license
            var licenseCount = config.TrialMaxDeviceCount;
            var licenseDays = config.TrialDays;
            for (int i = 0; i < licenseCount; i++) {
                License license = new License ();
                license.UserName = User.Identity.Name;
                license.LicenseType = LicenseType.Trial;
                license.GenerateDate = DateTime.Now;
                license.ValidDays = licenseDays;
                license.Status = LicenseStatus.InActive;
                ctx.Licenses.Add (license);
            }
            ctx.SaveChanges ();
            //
        }

        [HttpPost]
        public IActionResult Create ([FromBody] InstanceCreateModel model) {
            string userName = User.Identity.Name;

            if (IsAgent ()) {
                return BadRequest ("代理商账号不能创建实例,请使用代理商租户账号创建实例.");
            }

            var instance = ctx.Instances.FirstOrDefault (x => x.UserName == userName);
            if (instance != null) {
                return Ok (instance);
            }

            var resourceServer = AppInstance.Instance.Config.ResourceServers.First().Domain;
            if (model.IsTrial) {                             
                TrialLicenseCreate();
            }
            if (instance == null) {
                instance = new Instance ();
                instance.UserName = userName;
                instance.CreateDate = DateTime.Now;
                instance.FileServer = resourceServer;
                instance.MQTTServer = AppInstance.Instance.Config.MQTTServer;
                //var identity = ctx.Instances.AsQueryable().Select (x => x.Id).DefaultIfEmpty ().Max () + 1;
               
                instance.IsTrial = model.IsTrial;
                ctx.Instances.Add (instance);
                ctx.SaveChanges ();
            }

           
            return Ok(instance);

        }
    }
}