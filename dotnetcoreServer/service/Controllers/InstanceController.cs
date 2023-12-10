
using System;
using System.Collections.Generic;
using System.Linq;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;


namespace Ioliz.Service.Controllers;

[Route("/api/[controller]/[action]")]
[Authorize]
public class InstanceController : BaseController
{
    private InstanceRepository instanceRep = null;
    public InstanceController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {
        instanceRep = new InstanceRepository(ctx);
    }

    [Route("/api/instances")]
    public List<Instance> GetServerInstances([FromBody] string server)
    {
        return ctx.Instances.AsQueryable().Where(x => x.FileServer == server).ToList();
    }

    [Route("/api/instance")]
    //获取可用实例
    public InstanceModel GetInstance()
    {
        InstanceModel model = new InstanceModel();

        var userName = User.Identity.Name;
        var instance = ctx.Instances.FirstOrDefault(x => x.UserName == userName);
        var config = AppInstance.Instance.Config;
        model.TrialCount = config.TrialMaxDeviceCount;

        if (instance != null)
        {
            // model.InstanceAvailiable = true;
            model.CreateDate = instance.CreateDate;
            model.Server = instance.FileServer;
            model.IsTrial = instance.IsTrial;
        }

        var orders = ctx.Orders.AsQueryable().Where(x => x.UserName == userName);
        model.IsPaid = orders.Any(x => x.IsPaid);
        if (model.IsPaid)
        {
            model.IsCreateService = true;
        }
        else
        {
            model.IsCreateService = orders.Any();
        }

        List<License> licenses = null;
        if (model.IsPaid)
        {
            licenses = ctx.Licenses.AsQueryable()
                .Where(x => x.UserName == userName && x.LicenseType == LicenseType.Formal)
                .ToList();
            model.WillExpiredCount = licenses.Where(x => x.Status == LicenseStatus.Active &&
                x.ActivationdDate.Value.AddDays(x.ValidDays).Subtract(DateTime.Now).TotalDays < 15).Count();
        }

        if (model.IsTrial)
        {
            licenses = ctx.Licenses.AsQueryable()
                .Where(x => x.UserName == userName && x.LicenseType == LicenseType.Trial)
                .ToList();
        }

        if (licenses != null)
        {
            model.LicenseCount = licenses.Count();
            model.AvailiableLicenseCount = licenses.Count(x => !x.ActivationdDate.HasValue);
            model.UsedLicenseCount = model.LicenseCount - model.AvailiableLicenseCount;
        }

        return model;
    }



    [HttpPost]
    public IActionResult Create()
    {

        if (IsAgent())
        {
            return BadRequest("Agent accounts cannot create instances. Please use agent tenant accounts to create instances.");
        }
        var instance = instanceRep.InstanceCreate(User.Identity.Name);

        return Ok(instance);

    }
}