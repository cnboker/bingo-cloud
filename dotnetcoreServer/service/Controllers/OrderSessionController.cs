using System;
using Ioliz.Service;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace Ioliz.Service.Controllers;


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
  var instance = ctx.Instances.FirstOrDefault(x => x.UserName == userName);
  //试用实例是否已经创建
  var isCreateTrial = false;
  if(instance != null){
    isCreateTrial = instance.IsTrial;
  }
  return new
  {
    isCreateTrial,
    deviceCount = ctx.Devices.Count(c=>c.UserName == userName),
    trialDeviceCount = AppInstance.Instance.Config.TrialMaxDeviceCount,
    price = AppInstance.Instance.Config.PricePerDay,
    
  };

}
}