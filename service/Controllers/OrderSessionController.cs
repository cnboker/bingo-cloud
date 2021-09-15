using System;
using Ioliz.Service;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace Ioliz.Service.Controllers
{

  [Authorize]
  [Route("api/[controller]")]
  public class OrderSessionController : BaseController
  {
    public OrderSessionController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {

    }
    public dynamic Get()
    {
      var userName = User.Identity.Name;
      var instance = ctx.Instances.FirstOrDefault(x => x.TenantUserName == userName);
      var isCreateTrial = instance == null;
      return new
      {
        isCreateTrial,
        trialDeviceCount = AppInstance.Instance.Config.TrialMaxDeviceCount,
        price = AppInstance.Instance.Config.PricePerDay,
        discount = AppInstance.Instance.Config.Discount
      };

    }
  }
}