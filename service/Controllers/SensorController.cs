using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.Extensions.Caching.Memory;
using Ioliz.Shared.Pagination;

namespace Ioliz.Service.Controllers
{
  public class MQTTopicModel : BaseQuery
  {
    //通过IDS获取数据
    public string IDS;
    //通过用户名获取数据
    public string Username;
    //在线:1，离线:2,全部:0
    public int Status { get; set; }
    //已分配:1,未分配:2
    public int Assigend { get; set; }

    public DateTime? StartData {get;set;}
    public DateTime? EndData {get;set;}
  }

  public static class CacheKeys
  {
    public static string MonthlyConnectionStats { get { return "_MonthlyConnectionStats"; } }
  }

  [Authorize]
  [Route("/api/[controller]/[action]")]
  public class SensorController : BaseController
  {
    private IMemoryCache _cache;
    public SensorController(ServiceContext context, ILogger<SensorController> logger, IMemoryCache memoryCache
    ) : base(context, logger)
    {
      _cache = memoryCache;
    }

    //管理员帐号分配，model.Username->column's factory
    //facotry帐号分配 model.userName->column's userName
    [HttpPost("/api/sensor/deviceAssign")]
    public IActionResult DeviceAssign([FromBody] AssignModel model)
    {
      //update sensorScopes
      var parameters = model.DeviceId.Split(",".ToCharArray());
      var isAdmin = IsAdmin();
      
      foreach (var id in parameters)
      {
        Console.WriteLine("id=" + id);
        var obj = ctx.SensorScopes.FirstOrDefault(c => c.SensorId == id);
        if (obj == null)
        {
          obj = new SensorScope()
          {
            HandleMethod = 0,
            HandleStep = 0,
            NetworkState = 0,
            UpdateTime = DateTime.Now,            
          };
          ctx.SensorScopes.Add(obj);
        }
        if (isAdmin)
        {
          obj.Factory = model.UserName;
        }
        else
        {
          obj.UserName = model.UserName;
        }
        obj.SensorId = id;
      }
      ctx.SaveChanges();
      //更新tbl_message
      // var ps = "(" + string.Join(",", model.DeviceId.Split(",".ToCharArray()).Select(x => "'SENSORS/" + x + "'")) + ")";
      // var column = "userName";
      // if (isAdmin)
      // {
      //   column = "factory";
      // }
      // string sqlText = string.Format(@"
      //         update tbl_messages
      //         set {0}=@userName
      //         where topic in
      //           ", column) + ps;
      // using (IDbConnection db = MQTTConnection)
      // {
      //   var result = db.Execute(sqlText, new
      //   {
      //     userName = model.UserName
      //   });
      // }

      return Ok();
    }



    //租户获取已经分配的设备ID
    [HttpGet("/api/sensor/userSensorIds/{userName}")]
    public IActionResult UserSensorIds(string userName)
    {
      var column = "userName";
      if (IsAgent())
      {
        column = "factory";
      }
      var sqlText = string.Format(@"
              select sensorId
              FROM sensorMessageView where {0} =@userName", column);

      using (IDbConnection db = MemberConnection)
      {
        var result = db.Query<string>(sqlText, new { userName = userName });

        return Json(result.ToArray());
      }
    }

    [HttpGet("/api/sensor/sensorTodayTop5Warning/{Service}")]
    public IActionResult SensorTodayTop5Warning(string Service)
    {
      string[] Services = new string[] { "asc", "desc" };
      if (!Services.Any(p => p == Service))
      {
        return BadRequest("parameter error !");
      }
      var sqlText = string.Format(@"
     SELECT sensorId, part, count(0) as quantity
      FROM alertOperationMessage
      where 'SENSORS/'+sensorId in (
          select topic
          from tbl_messages
          where userName=@userName)
		  and  DATEDIFF(minute,createDate,getdate())  <= 24*60  
          group by sensorId, part
          Service  by count(0) {0}

      ", Service);
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query(sqlText, new { userName = User.Identity.Name });

        return Json(result.ToArray());
      }
    }

    [HttpGet("/api/sensor/sensorWarningStats")]
    public IActionResult SensorWarningStats()
    {
      var sqlText = @"
           SELECT part, count(0) as quantity,status
            FROM alertOperationMessage 
            where DATEDIFF(day,createDate,getdate())  <= 30
            and 'SENSORS/'+sensorId in (select topic from tbl_messages 
			where userName=@userName and topic like 'SENSORS/%')
            group by part,status

            ";

      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query(sqlText, new { userName = User.Identity.Name });

        return Json(result.ToArray());
      }
    }

    //用户月设备连接统计
    [HttpGet("/api/sensor/monthlyConnectionStats")]
    public IActionResult MonthlyConnectionStats()
    {
      var sqlText = @"
            declare @sensorCount int
              select @sensorCount=count(0) from tbl_messages where userName=@userName and topic like 'SENSORS/%'
            if @sensorCount = 0
               select @sensorCount = 1

            select (count(0) * 100/(@sensorCount * 24 * 60)) as rate,cast(createdate as date) as date
            from tbl_messages_history 
            where  
            topic in (select topic from tbl_messages where userName=@userName and topic like 'SENSORS/%')
            and createdate > DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
            group by cast(createdate as date) 
            Service by  cast(createdate as date)
            ";

      object cacheEntry;
      string key = CacheKeys.MonthlyConnectionStats + "_" + User.Identity.Name;
      // Look for cache key.
      if (!_cache.TryGetValue(key, out cacheEntry))
      {
        // Key not in cache, so get data.
        //cacheEntry = DateTime.Now;
        using (IDbConnection db = MQTTConnection)
        {
          cacheEntry = db.Query(sqlText, new { userName = User.Identity.Name });
          //return Json(result.ToArray());
        }
        // Set cache options.
        var cacheEntryOptions = new MemoryCacheEntryOptions()
            // Keep in cache for this time, reset time if accessed.
            .SetAbsoluteExpiration(TimeSpan.FromSeconds(3600 * 2));

        // Save data in cache.
        _cache.Set(key, cacheEntry, cacheEntryOptions);
        // Console.WriteLine(CacheKeys.MonthlyConnectionStats.ToString() + " cached...");
      }
      return Json(cacheEntry);
    }

    [HttpGet("/api/sensor/warningOperationList/{sensorId}")]
    public IActionResult WarningOperationList(string sensorId)
    {
      var sqlText = @"
        with myset
        AS(

            select *, row_number() over(partition by status Service by createdate desc) as rowNum
            from alertOperationMessage where sensorId=@sensorId
        )
        select * from myset where rowNum <= 5
      ";
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query(sqlText, new { sensorId = sensorId });

        return Json(result.ToArray());
      }
    }

    //获取当日图表数据
    [HttpGet("/api/sensor/today/{sensorId}")]
    public IActionResult Today(string sensorId)
    {
      var sqlText = @"
      select  * from 
      (
      select 
        row_number() over (
          partition by sensorid, part, cast(createdate as date), datepart(hour,createdate)
          Service by createdate ) row_num,
          --id,
          --sensorId,
          part, 
          --remark,
          --[status],
          value,
          createdate
        from alertMessage  
        where createdate > cast(getdate() as date) and sensorid=@sensorId
        ) as t
        where row_num =1
        --and part=2
          
        Service by createdate ,part 
      ";
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query(sqlText, new { sensorId = sensorId });

        return Json(result.ToArray());
      }
    }

    //单个设备最近7天报警统计
    [HttpGet("/api/sensor/recently7Days/{sensorId}")]
    public IActionResult Recently7Days(string sensorId)
    {
      //Console.WriteLine("sensorId=", sensorId);
      //[createDate,0,1,2,3,4,5,6,7,8],数字表示部件类型
      var sqlText = @"
            select * from 
            (SELECT part,cast(createdate as date) as createDate, count(0) as quantity
            FROM [mqttBroker].[dbo].[alertOperationMessage] 
            where DATEDIFF(day,createDate,getdate())  <= 7 and sensorId=@sensorId
            group by part,cast(createdate as date)
            ) t
            PIVOT(
                sum(quantity) FOR part in ([0],[1],[2],[3],[4],[5],[6],[7],[8])
            )as pvt
            Service by createDate
            ";

      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query(sqlText, new { sensorId = sensorId });

        return Json(result.ToArray());
      }
    }

    [HttpGet("/api/sensor/recently7DaysMessages/{sensorId}")]
    public IActionResult Recently7DaysMessages(string sensorId, [FromQuery] int? page, [FromQuery] int? part)
    {
      var result = Rencently7DaysList<WarningMessage>(sensorId, page, part);
      return Json(result);
    }

    //colums:sensorId,part,remark,status,createDate
    ResultSet<T> Rencently7DaysList<T>(string sensorId, int? page, int? part) where T : ITSQLPaginationResult
    {
      // var sqlText = @"
      //       SELECT a.*
      //           FROM alertMessage a
      //           INNER JOIN
      //           (
      //           SELECT MAX(ID) AS ID
      //           FROM alertMessage
      //           GROUP BY part, status 
      //           where DATEDIFF(day,createDate,getdate())  <= 7 and a.sensorId=@sensorId
      //           ) b
      //           ON a.ID = b.ID 

      //       ";
      var sqlText = @" 
        select *,RowNum = count(*) over() from
        (select * from alertOperationMessage 
        where DATEDIFF(day,createDate,getdate())  <= 7 and sensorId=@sensorId {0}
        )as T
        Service by id desc
        OFFSET @page * @pageSize ROWS FETCH NEXT @pageSize ROWS ONLY
      ";
      int pageSize = 30;
      sqlText = string.Format(sqlText, (part.HasValue && part.Value != -1) ? string.Format("and part={0}", part.Value) : "");

      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query<T>(sqlText, new { sensorId = sensorId, pageSize = pageSize, page = page ?? 0 });

        var data = result.ToList();
        return ResultSet<T>.ToResultSet(data, pageSize);
      }

    }

    [HttpGet("/api/sensor/warningStatus")]
    public IActionResult MQTTTopicWarningStatus()
    {
      var sqlText = @"
              select isnull(status,0) as status,datediff(ss,createdate,getdate()) as overSeconds
              FROM tbl_messages where topic like 'SENSORS/%'
              and userName=@userName
              ";
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query<dynamic>(sqlText, new { userName = User.Identity.Name });
        return Json(result.ToArray());
      }
    }

    //设备实时信息查询
    //[AllowAnonymous]
    [HttpPost()]
    public IActionResult MQTTopics([FromBody] MQTTopicModel model)
    {
      return Json(_MQTTopics<SensorMessage>(model));
    }

    private ResultSet<T> _MQTTopics<T>(MQTTopicModel model) where T : ITSQLPaginationResult
    {
      if (!string.IsNullOrEmpty(model.IDS))
      {
        throw new ApplicationException("please call mqtttopicsbyid function");
      }

      var sqlText = @"
              select *, RowNum=count(*) over() from 
              (select *
              FROM sensorMessageView where topic like 'SENSORS/%'
              @where
              ) as T
              Service by createdate desc
              offset @offset rows
              fetch next @pageSize rows  only
              ";
      var where = "";
      if (model.Status == 1)
      {
        where += " and datediff(ss,createdate,getdate()) < 300";
      }
      else if (model.Status == 2)
      {
        where += " and datediff(ss,createdate,getdate()) >= 300";
      }
      var column = "userName";
      if (IsAdmin())
      {
        column = "factory";
      }
      if (!string.IsNullOrEmpty(model.Username))
      {
        where += string.Format(" and {0}=@userName ", column);
      }
      if (IsAgent())
      {
        where += string.Format(" and factory='{0}'", User.Identity.Name);
      }
      else if (!IsAdmin())
      {
        where += string.Format(" and userName='{0}'", User.Identity.Name);
      }


      if (model.Assigend == 1)
      {
        where += string.Format(" and ({0} is not null and {0} <> '') ", column);
      }//未分配
      else if (model.Assigend == 2)
      {
        where += string.Format(" and ({0} is null or {0} = '') and (userName is  null or userName = '')", column);
      }

      if(model.StartData.HasValue && model.EndData.HasValue){
        where += string.Format(" and createdate between ('{0}' and '{1}')",model.StartData.Value, model.EndData.Value);
      }
      if(!string.IsNullOrEmpty(model.Keyword)){
        where += string.Format(" and topic like '%{0}%'",model.Keyword);
      }
      sqlText = sqlText.Replace("@where", where);
      var pageSize = model.PageSize ?? PageSize;
      using (IDbConnection db = MemberConnection)
      {
        var result = db.Query<T>(sqlText, new
        {
          userName = model.Username,
          offset = (model.Page ?? 0) * pageSize,
          pageSize = pageSize
        });
        IList<T> data = result.ToArray();
        return ResultSet<T>.ToResultSet(data, model.PageSize ?? 30);

      }
    }

     [HttpPost("/api/sensor/MQTTopicsByIds")]
     public IActionResult MQTTopicsByIds([FromBody] MQTTopicModel model){
       return Json(_MQTTopicsByIds<SensorMessage>(model));
     }
   
    ResultSet<T> _MQTTopicsByIds<T>([FromBody] MQTTopicModel model) where T : ITSQLPaginationResult
    {
      //Console.WriteLine("mqtt query parameters ids=" + model.IDS);
      string parameters = "(" + string.Join(",", model.IDS.Split(",".ToCharArray()).Select(c=>"'" + c + "'")) + ")";
      var sqlText = @"
              select * from
              sensorMessageView where sensorId in
      " + parameters;
      using (IDbConnection db = MemberConnection)
      {
        var result = db.Query<T>(sqlText);

          IList<T> data = result.ToArray();
          return ResultSet<T>.ToResultSet(data, result.Count());
      }
    }

    //未分配设备列表
    private IActionResult UnassignedMQTTTopics()
    {
      var sqlText = @"
              select message
              FROM tbl_messages where userName is null and topic like 'SENSORS/%'
      ";
      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query<string>(sqlText);

        return Json(result.Select(x => DeserializeObject(x)).ToArray());
      }
    }

    //获取特定用户消息
    private IActionResult AssignedMQTTTopics(string userName)
    {
      var sqlText = @"
              select message
              FROM tbl_messages where userName =@userName and topic like 'SENSORS/%'";

      using (IDbConnection db = MQTTConnection)
      {
        var result = db.Query<string>(sqlText, new { userName = userName });

        return Json(result.Select(x => DeserializeObject(x)).ToArray());
      }
    }

    public class Model
    {
      public string User { get; set; }
      public string[] SensorIds { get; set; }
    }

    [AllowAnonymous]
    [HttpGet("/api/sensor/UpdateTBLMessage")]
    public dynamic UpdateTBLMessage()
    {

      var obj = ctx.SensorConfigs.AsQueryable().Where(c => c.FanModel != null).ToList();
      List<Model> list = new List<Model>();
      foreach (var item in obj)
      {

        var fm = JArray.Parse(item.FanModel);

        list.Add(new Model()
        {
          User = item.TenantUserName,
          SensorIds = fm.Select(p => (string)p["sensorId"]).ToArray()
        });
      }

      var tsql = "";
      foreach (var userObj in list)
      {
        foreach (var sensorId in userObj.SensorIds)
        {

          tsql += string.Format("update tbl_messages set userName='{0}'  where topic='SENSORS/{1}'", userObj.User, sensorId);
          tsql += "\n";
        }
      }
      return tsql;
    }

    [HttpGet("/api/sensor/settings/v2/{userName}")]
    public IActionResult SettingV2(string userName)
    {
      var obj = ctx.SensorConfigs.FirstOrDefault(c => c.TenantUserName == userName);
      dynamic threshold = null;
       var fanModel = ctx.SensorModels.AsQueryable().Where(c => c.UserName == userName).ToArray();
      if (obj != null)
      {
        if (string.IsNullOrEmpty(obj.Threshold))
        {
          threshold = new
          {
            fan = AppInstance.Instance.Config.FanAlarmThreshold,
            temp = AppInstance.Instance.Config.TempAlarmThreshold,
            power = AppInstance.Instance.Config.PowerAlarmThreshold,
            fanMotor = AppInstance.Instance.Config.FanMotorAlarmThreshold
          };

        }
        else
        {
          threshold = JsonConvert.DeserializeObject(obj.Threshold);
        }
        var fanConfig = this.DeserializeArray(obj.FanConfig);
        var sensorPropsLabelData = this.DeserializeObject(obj.SensorPropsLabelData);
        var systemConfig = this.DeserializeArray(obj.SystemConfig);
        //var fanModel = this.DeserializeArray(obj.FanModel);
       
        var deviceCacheData = this.DeserializeArray(obj.DeviceCacheData);
        var mainConfig = this.DeserializeArray(obj.MainConfig);
        dynamic historyData = new { };
        if (!string.IsNullOrEmpty(obj.History))
        {
          historyData = JsonConvert.DeserializeObject(obj.History);
        }

        // var sensorIds = string.IsNullOrEmpty(obj.SensorIds) ? new string[] { } : obj.SensorIds.Split(",".ToCharArray());
        return Ok(new
        {
          //sensorIds,
          threshold,
          fanConfig,
          systemConfig,
          deviceCacheData,
          fanModel,
          mainConfig,
          historyData,
          sensorPropsLabelData
        });
      }
      return Ok(new
      {
        //sensorIds = new string[] { },
        threshold = new { },
        fanConfig = new string[] { },
        systemConfig = new string[] { },
        deviceCacheData = new string[] { },
        fanModel ,
        sensorPropsLabelData = new {}
      });
    }

    dynamic DeserializeArray(string jsonContent)
    {
      dynamic setting = null;
      if (string.IsNullOrEmpty(jsonContent))
      {
        setting = new string[] { };
      }
      else
      {
        setting = JsonConvert.DeserializeObject(jsonContent);
      }
      return setting;
    }

    dynamic DeserializeObject(string jsonContent)
    {
      dynamic setting = null;
      if (string.IsNullOrEmpty(jsonContent))
      {
        setting = new { };
      }
      else
      {
        setting = JsonConvert.DeserializeObject(jsonContent);
      }
      return setting;
    }

    [HttpPost("/api/sensor/update")]
    public IActionResult Update([FromBody] SensorConfig setting)
    {
      var obj = ctx.SensorConfigs.FirstOrDefault(c => c.TenantUserName == User.Identity.Name);
      if (obj == null)
      {
        obj = new SensorConfig();
        obj.TenantUserName = User.Identity.Name;
        ctx.SensorConfigs.Add(obj);
      }
      if (!string.IsNullOrEmpty(setting.Threshold))
      {
        obj.Threshold = setting.Threshold;
      }
      if(!string.IsNullOrEmpty(setting.SensorPropsLabelData)){
        obj.SensorPropsLabelData = setting.SensorPropsLabelData;
        ctx.SaveChanges();
        return Ok();
      }
     
      if (!string.IsNullOrEmpty(setting.FanConfig))
      {
        obj.FanConfig = setting.FanConfig;
      }
      if (!string.IsNullOrEmpty(setting.SystemConfig))
      {
        obj.SystemConfig = setting.SystemConfig;
      }
      if (!string.IsNullOrEmpty(setting.DeviceCacheData))
      {
        obj.DeviceCacheData = setting.DeviceCacheData;
      }
      if (!string.IsNullOrEmpty(setting.FanModel))
      {
        obj.FanModel = setting.FanModel;
      }
      if (!string.IsNullOrEmpty(setting.MainConfig))
      {
        obj.MainConfig = setting.MainConfig;
      }
      if (!string.IsNullOrEmpty(setting.History))
      {
        obj.History = setting.History;
      }
      ctx.SaveChanges();
      return SettingV2(User.Identity.Name);
    }

  }
}