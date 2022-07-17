using System;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Localization;
using Ioliz.Service.Repositories;
using System.Linq;

namespace Ioliz.Service.Controllers
{
    [Authorize]
    [Route("api/[controller]/[action]")]

    public class HomeController : BaseController
    {
        private HomeRepository homeRep = null;
        public HomeController(ServiceContext ctx, ILogger<HomeController> logger, IStringLocalizer<HomeController> localizer) : base(ctx, logger, localizer)
        {
            homeRep = new HomeRepository(localizer);
        }

        public IActionResult Index()
        {
            var result = homeRep.GetIndexModel(User.Identity.Name);
            var deviceIds = ctx.Devices.AsQueryable().Where(c => c.UserName == User.Identity.Name).Select(c => c.DeviceId).ToArray();
            var deviceStateList = DeviceStateMemoryCache.Get(deviceIds);
            result.BasicInfo.OnlineCount = deviceStateList.Where(c => c.NetworkStatus == NetworkStatus.Running).Count();
            result.BasicInfo.OfflineCount = deviceIds.Length - result.BasicInfo.OnlineCount;
            return Json(result);
        }
    }
}