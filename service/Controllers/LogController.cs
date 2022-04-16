using Ioliz.Service.Controllers;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Dapper;
using System.Data;

using System.Linq;
using Ioliz.Service;
using System;

[Route("/api/[controller]/[action]")]
[Authorize]
public class LogController : BaseController
{

    public LogController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {

    }

    //推送流量数据
    [HttpPost]
    public ApiResult Post([FromForm] DeviceLog model)
    {
        //var device = ctx.NetTrafficInfos.FirstOrDefault(x => x.DeviceId == model.MAC);
        var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
        if (device == null)
        {
            throw new ApplicationException(string.Format("{0}未找到", model.DeviceId));
        }
        ctx.DeviceLogs.Add(model);
        ctx.SaveChanges();
        return new ApiResult() { Message = "ok" };
    }

   
    //首页日志统计
    [HttpGet]
    public dynamic LogsStats()
    {
        string sqlText = @"
        select set @count=count(0) from deviceLog where tenant=@tenant
        select set @todayCount =count(0) from  where tenant=@tenant and createdate betwwn current_date and now()
        select set @errorCount = count(0) from deviceLog where tenant=@tenant and logType=2
        select @count, @toadyCount, @errorCount
        ";

        string sqlTop30 = @"
          select         
            *
            from [dbo].[deviceLog] where tenant=@tenant order by id desc limit 30
		";

        using (IDbConnection db = MemberConnection)
        {
            var result = db.QuerySingle(sqlText, new
            {
                tenant = User.Identity.Name,
            });

            var list = db.QuerySingle(sqlTop30, new
            {
                tenant = User.Identity.Name,
            });
            return new
            {
                summary=result,
                topList=list
            };

        }
    }

    [HttpPost]
    public ResultSet<T> Query<T>([FromBody] TrafficQuery query) where T : ITSQLPaginationResult
    {
        string sqlText = @"
        select *,RowNum = COUNT(*) OVER() from 
        (select
            tenantUserName as tenant,
            deviceId,networkInterfaceType, 
            cast(startdate as date) as date,
            (sum(BytesReceived+BytesSent)/1048576) as payload 
            from [dbo].[NetTrafficInfos]
            where StartDate between @startdate and @enddate
            group by deviceId,networkInterfaceType, cast(startdate as date)
        ) as T
        where  @tenant is null or @tenant = '' or tenant=@tenant
         Service by date desc
        offset @offset rows
        fetch next @pageSize rows only
        ";
        if (!query.StartDate.HasValue)
        {
            query.StartDate = DateTime.MinValue;
        }
        if (!query.EndDate.HasValue)
        {
            query.EndDate = DateTime.MaxValue;
        }

        using (IDbConnection db = MemberConnection)
        {
            var result = db.Query<T>(sqlText, new
            {
                tenant = query.Tenant,
                startdate = query.StartDate,
                enddate = query.EndDate.Value.AddDays(1),
                offset = (query.Page ?? 0) * query.PageSize,
                pageSize = PageSize
            });
            var data = result.ToArray();
            return new ResultSet<T>
            {
                Records = data,
                //PageCount = (data.Length > 0 ? data[0].RowNum : 0) / query.PageSize.Value
                PageCount = data.Length > 0 ? (data[0].RowNum / query.PageSize.Value + (data[0].RowNum % query.PageSize.Value > 0 ? 1 : 0)) : 0
            };
        }
    }
}