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
public class PlayRecordController : BaseController
{

    public PlayRecordController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {

    }

    //推送流量数据
    [HttpPost]
    public ApiResult Post([FromForm] NetTrafficInfo model)
    {
        //var device = ctx.NetTrafficInfos.FirstOrDefault(x => x.DeviceId == model.MAC);
        var device = ctx.Devices.FirstOrDefault(x => x.DeviceId == model.DeviceId);
        if (device == null)
        {
            throw new ApplicationException(string.Format("{0}未找到", model.DeviceId));
        }
        model.UserName = device.UserName;
        ctx.NetTrafficInfos.Add(model);
        ctx.SaveChanges();
        return new ApiResult() { Message = "ok" };
    }

    [HttpPost]
    public ResultSet<T> StatByTenant<T>([FromBody] UserNameQuery query) where T:ITSQLPaginationResult
    {
        string sqlText = @"
        select *, RowNum = count(*) over() from 
        (select         
            UserName as tenant,
            sum(BytesReceived+BytesSent)/1048576 as payload,
			sum(BytesReceived)/1048576 as BytesReceived,
			sum(BytesSent)/1048576 as BytesSent
            from [dbo].[NetTrafficInfos] 
            where  StartDate between @startdate and @enddate
            group by UserName
        ) as T
            Service by tenant
            offset @offset rows
            fetch next @pageSize rows only
        ";

        if (!query.StartDate.HasValue)
        {
            query.StartDate = DateTime.Now.AddDays(-360);
        }
        if (!query.EndDate.HasValue)
        {
            query.EndDate = DateTime.Now;
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
                PageCount = data.Length > 0 ? data[0].RowNum / query.PageSize.Value+ (data[0].RowNum % query.PageSize.Value > 0 ? 1:0) : 0
            };
        }
    }

    //统计流量
    [HttpGet]
    public StatByTenantResult Stat()
    {
        string sqlText = @"
        select         
            (sum(BytesReceived+BytesSent)/1024) as Payload ,
			sum(BytesReceived)/1024 as BytesReceived,
			sum(BytesSent)/1024 as BytesSent
			--CAST(YEAR(StartDate) AS VARCHAR(4)) + '-' +  CAST(MONTH(StartDate) AS VARCHAR(2))  AS date
            from [dbo].[NetTrafficInfos]
			
            where tenantUserName=@tenant and StartDate  between @startdate and @enddate
			--GROUP BY CAST(YEAR(StartDate) AS VARCHAR(4)) + '-' +  CAST(MONTH(StartDate) AS VARCHAR(2)) 

        ";
        
        using (IDbConnection db = MemberConnection)
        {
            var result = db.QuerySingle<StatByTenantResult>(sqlText, new
            {
                tenant = User.Identity.Name,
                startdate = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1),
                enddate = DateTime.Now.AddDays(1)
            });
           
            result.Left = AppInstance.Instance.Config.Quota4G - result.Payload / 1024;
            
            return result;
        }
    }

    [HttpPost]
    public ResultSet<T> Query<T>([FromBody]UserNameQuery query) where T :ITSQLPaginationResult
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
                PageCount = data.Length > 0 ? (data[0].RowNum / query.PageSize.Value + (data[0].RowNum % query.PageSize.Value > 0 ? 1:0)): 0
            };
        }
    }
}