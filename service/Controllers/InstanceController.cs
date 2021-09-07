
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;


namespace Ioliz.Service.Controllers {

    [Route ("/api/[controller]/[action]")]
    [Authorize]
    public class InstanceController : BaseController {
        public InstanceController (ServiceContext ctx, ILogger<BaseController> logger) : base (ctx, logger) { }

        [Route ("/api/serverInstances")]
        public List<Instance> GetServerInstances ([FromBody] string server) {
            return ctx.Instances.AsQueryable().Where (x => x.Server == server && x.IsInitialize).ToList ();
        }

        [Route ("/api/instance")]
        //获取可用实例
        public InstanceModel GetInstance () {
            InstanceModel model = new InstanceModel ();

            var userName = User.Identity.Name;
            var instance = ctx.Instances.FirstOrDefault (x => x.TenantUserName == userName);
            var config = AppInstance.Instance.Config;
            model.TrialCount = config.TrialMaxDeviceCount;

            if (instance != null) {
                // model.InstanceAvailiable = true;
                model.CreateDate = instance.CreateDate;
                model.InstanceName = instance.InstanceName;
                model.Server = instance.Server;
                model.ApiServer = instance.ApiServer;
                model.IsInitialize = instance.IsInitialize;
                model.IsTrial = instance.IsTrial;
            }

            var orders = ctx.Orders.AsQueryable().Where (x => x.TenantUserName == userName);
            model.IsPaid = orders.Any (x => x.IsPaid);
            if (model.IsPaid) {
                model.IsCreateService = true;
            } else {
                model.IsCreateService = orders.Any ();
            }

            List<License> licenses = null;
            if (model.IsPaid) {
                licenses = ctx.Licenses.AsQueryable()
                    .Where (x => x.TenantUserName == userName && x.LicenseType == LicenseType.Formal)
                    .ToList ();
                model.WillExpiredCount = licenses.Where (x => x.Status == LicenseStatus.Active &&
                    x.ActivationdDate.Value.AddDays (x.ValidDays).Subtract (DateTime.Now).TotalDays < 15).Count ();
            }

            if (model.IsTrial) {
                licenses = ctx.Licenses.AsQueryable()
                    .Where (x => x.TenantUserName == userName && x.LicenseType == LicenseType.Trial)
                    .ToList ();
            }

            if (licenses != null) {
                model.LicenseCount = licenses.Count ();
                model.AvailiableLicenseCount = licenses.Count (x => !x.ActivationdDate.HasValue);
                model.UsedLicenseCount = model.LicenseCount - model.AvailiableLicenseCount;

            }

            return model;
        }

        private void TrialLicenseCreate (string domain) {
            var config = AppInstance.Instance.Config;
            //validate server
            // using (HttpClient client = new HttpClient())
            // {
            //   var url = config.AuthServer + "api/server/trial/" + domain;
            //   var response = client.GetStringAsync(url).Result;
            //   if (!TypeConvertor.Convert<bool>(response))
            //   {
            //     throw new Exception("domain exception");
            //   }
            // }

            //create license

            var licenseCount = config.TrialMaxDeviceCount;
            var licenseDays = config.TrialDays;
            for (int i = 0; i < licenseCount; i++) {
                License license = new License ();
                license.TenantUserName = User.Identity.Name;
                license.LicenseType = LicenseType.Trial;
                license.Certification = Ioliz.Shared.Utils.StringHelper.GetRandom (128);
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

            var instance = ctx.Instances.FirstOrDefault (x => x.TenantUserName == userName);
            if (instance != null && instance.IsInitialize) {
                return Ok (instance);
            }

            var svrArr = model.Server.Split (",".ToCharArray ());
            var domain = svrArr[0];
            var apiDomain = svrArr[1];
            if (model.IsTrial) {                             
                TrialLicenseCreate (domain);
            }
            if (instance == null) {
                instance = new Instance ();
                instance.InstanceName = StringHelper.GetRandom (6);
                instance.TenantUserName = userName;
                instance.CreateDate = DateTime.Now;
                instance.IsInitialize = false;
                instance.Server = domain + "/";
                instance.ApiServer = apiDomain + "/";
                var identity = ctx.Instances.AsQueryable().Select (x => x.Id).DefaultIfEmpty ().Max () + 1;
                instance.DatabaseName = string.Format ("db{0}", identity);
                instance.Resource = "file" + identity;
                instance.IsTrial = model.IsTrial;
                ctx.Instances.Add (instance);
                ctx.SaveChanges ();
            }

            //Uri uri = new Uri(model.Server);
            //var domain = uri.GetLeftPart(UriPartial.Authority).Replace("http://", "");
            //domain = domain.Substring(domain.IndexOf(".") + 1);
            //remote initialize
            var url = string.Format ("{0}{1}", apiDomain, AppInstance.Instance.Config.CreateInstanceUrl);
            logger.LogInformation (model.Server + "remote call url:" + url);
            var config = AppInstance.Instance.Config;
            //reference http://pawel.sawicz.eu/async-and-restsharp/
            
            using (HttpClient client = new HttpClient()) {
                var parameters = new {
                Database = instance.DatabaseName,
                Resource = instance.Resource,
                Authkey = AppInstance.Instance.Config.Authkey,
                TenantUserName = userName,
                InstanceName = instance.InstanceName,
                Server = instance.Server,
                ApiServer = instance.ApiServer,
                TrialDays = config.TrialDays,
                TrialMaxDeviceCount = config.TrialMaxDeviceCount,
                TrialMaxUploadVideoFileSize = config.TrialMaxUploadVideoFileSize,
                TrialMaxUsePictureCount = config.TrialMaxUsePictureCount,
                IsTrial = model.IsTrial
                };
                var content = new System.Net.Http.StringContent(JsonConvert.SerializeObject (parameters), System.Text.Encoding.UTF8, "application/json");
                content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                logger.LogInformation ("instance remote  url:" + url);
                logger.LogInformation ("instance content:" + content.ReadAsStringAsync().Result);
                var response = client.PostAsync (url, content).Result;
                if (response.IsSuccessStatusCode) {
                    instance.IsInitialize = true;
                    ctx.SaveChanges ();
                    return Ok (instance);
                } else {
                    var error = response.Content.ReadAsStringAsync ().Result;
                    logger.LogInformation("instance error=" + error);
                    return BadRequest (error);
                }
            }

        }
    }
}