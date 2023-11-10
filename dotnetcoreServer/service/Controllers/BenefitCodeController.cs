using System;
using System.Collections.Generic;
using System.Linq;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Ioliz.Service.Controllers;

[Authorize]
[Route("/api/[controller]/[action]")]
public class BenefitCodeController : BaseController
{
public BenefitCodeController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
{
}

public IActionResult Create()
{
  DateTime now = DateTime.Parse(DateTime.Now.ToShortDateString());
  int maxCountByDay = AppInstance.Instance.Config.MaxBenefitCountByDay;
  if (maxCountByDay > 0)
  {
    if (ctx.BenefitCodes.AsQueryable().Where(x => x.Creator == User.Identity.Name &&
           (x.CreateDate > now && x.CreateDate <= DateTime.Now)).Count() > maxCountByDay)
    {
      return BadRequest("已超过当天允许最大生成数量");
    }
  }

  BenefitCode entity = new BenefitCode()
  {
    CreateDate = DateTime.Now,
    Code = GetCode(),
    Creator = User.Identity.Name
  };
  ctx.BenefitCodes.Add(entity);
  ctx.SaveChanges();
  return Ok(entity);
}

private string GetCode()
{
  string code = StringHelper.GetRandom(6);
  if (ctx.BenefitCodes.Any(x => x.Code == code))
  {
    code = StringHelper.GetRandom(6);
  }
  return code;
  
}
public IEnumerable<BenefitCode> GetAll() => ctx.BenefitCodes.AsQueryable().Where(x => x.Creator == User.Identity.Name).OrderByDescending(c=>c.CreateDate).ToList();


}