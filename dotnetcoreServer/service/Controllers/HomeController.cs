using System;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Localization;
using Ioliz.Service.Repositories;

namespace Ioliz.Service.Controllers
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    
  public class HomeController : BaseController
  {
    private HomeRepository homeRep = null;
    public HomeController(ServiceContext ctx, ILogger<HomeController> logger, IStringLocalizer<HomeController> localizer):base(ctx,logger,localizer)
    {
      homeRep = new HomeRepository(localizer);
    }

    public IActionResult Index(){
        return Json(homeRep.GetIndexModel(User.Identity.Name));
    }
  }
}