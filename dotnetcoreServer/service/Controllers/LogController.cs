using Ioliz.Service.Controllers;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Data;

using System.Linq;
using System;

[Route("/api/[controller]/[action]")]
[Authorize]
public class LogController : BaseController
{

    public LogController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {

    }

    //推送流量数据
    [HttpPost("/api/log")]
    public ApiResult Post([FromForm] DeviceLog model)
    {
        //var device = ctx.NetTrafficInfos.FirstOrDefault(x => x.DeviceId == model.MAC);
        var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
        if (device == null)
        {
           return new ApiResult() {Result=1 ,Message = "device not found" };
        }
        model.Tenant = device.UserName;
        model.DeviceName = device.Name;
        model.CreateDate = DateTime.Now;
        ctx.DeviceLogs.Add(model);
        ctx.SaveChanges();
        return new ApiResult() { Message = "ok" };
    }


    [HttpGet("/api/log")]
    public ActionResult Query([FromQuery] UserNameQuery query)
    {
        var queryObjects = ctx.DeviceLogs.AsEnumerable();
        if (!query.StartDate.HasValue)
        {
            query.StartDate = DateTime.MinValue;
        }
        if (!query.EndDate.HasValue)
        {
            query.EndDate = DateTime.MaxValue;
        }
        else
        {
            query.EndDate = query.EndDate.Value.AddDays(1);
        }
        var page = (query.Page ?? 0) * (query.PageSize ?? 30);
        queryObjects = queryObjects.Where(c => c.CreateDate > query.StartDate && c.CreateDate < query.EndDate);
        var result = queryObjects.Skip(page).Take(query.PageSize.Value).ToArray();
        var count = queryObjects.Count();
        var pageCount = count / query.PageSize.Value + (count % query.PageSize.Value > 0 ? 1 : 0);
        return Json(new
        {
            Records = result,
            PageCount = pageCount,
            RowNum = count,
        });


    }
}