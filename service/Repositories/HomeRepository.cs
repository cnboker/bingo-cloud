using System;
using System.Linq;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Ioliz.Service;
using System.Net.Http;
using Newtonsoft.Json;
using Ioliz.Service.Repositories;
using Microsoft.Extensions.Configuration;
using System.Data;
using Dapper;
using System.Collections.Generic;

namespace Member.Repositories
{
    public class HomeRepository : RepositoryBase
    {

        PowerRepository powerRep = null;

        //drapper dependency
        public HomeRepository()
        {
            powerRep = new PowerRepository();
        }

        public ExceptionHandlerStatsModel GetExceptionHandlerStats(string userName)
        {
            var tsql = @"
            select 
            (select count(0) from RepairApplies where applyer=@userName and ApplyState=1) as UnhandleCount,
            (select count(0) from RepairApplies where applyer=@userName and ApplyState=2) as HandlingCount,
            (select count(0) from RepairApplies where applyer=@userName and ApplyState=3) as WaitingConfirmCount
            ";
            using (IDbConnection db = MemberConnection)
            {
                return db.QuerySingle<ExceptionHandlerStatsModel>(tsql, new { userName = userName });
            }
        }
        public WorkTimeStatsModel GetWorkTime(string userName)
        {
            WorkTimeStatsModel model = new WorkTimeStatsModel();
            model.WorkAllTimeDuration = GetWorkDuration(userName);
            var model1 = GetFaultProcessDuration(userName);
            model.ErrorHandleTimeDuration = model1.ErrorHandleTimeDuration;
            model.ErrorHandleAverageTimeDuration = model1.ErrorHandleAverageTimeDuration;
            return model;
        }
        //故障处理总耗时
        private WorkTimeStatsModel GetFaultProcessDuration(string userName)
        {
            var tsql = @"
            select sum(DATEDIFF(hour,AcceptDate,FactoryFinisheddDate)) as ErrorHandleTimeDuration,
            sum(DATEDIFF(hour,AcceptDate,FactoryFinisheddDate))/count(0) as ErrorHandleAverageTimeDuration
            from RepairApplies where applyer=@userName
            and AcceptDate is not null and FactoryFinisheddDate is not null
            ";
            using (IDbConnection db = MemberConnection)
            {
                return db.QuerySingle<WorkTimeStatsModel>(tsql, new { userName = userName });
            }
        }

        //获取设备工作总时长
        private int GetWorkDuration(string userName)
        {
            var tsql = @"
            select isnull(sum(duration)/60,0) as hours from SensorWorkTimes
            where sensorId in( select replace(topic,'SENSORS/','') from tbl_messages where userName=@userName and topic like 'SENSORS/%')
            ";

            using (IDbConnection db = MQTTConnection)
            {
                var result = (IDictionary<string, object>)db.QuerySingleOrDefault(tsql, new { userName = userName });
                return Convert.ToInt32(result["hours"]);
            }
        }
        //获取设备状态
        public DeviceStatsModel GetDeviceStatsModel(string username)
        {
            var tsql = @"
                declare @offlineCount int
                declare @onlineCount int
                declare @warningCount int
                declare @fixedCount int 
                declare @normalCount int

                select @offlineCount = count(0) from SensorScopes where username=@userName
                and datediff(ss,updateTime,getdate()) >= 300

                select @onlineCount = count(0) from SensorScopes where username=@userName
                and datediff(ss,updateTime,getdate()) < 300 and  State <> 2

                select @normalCount = count(0) from SensorScopes where username=@userName
                and State=0  and datediff(ss,updateTime,getdate()) < 300

                select @warningCount = count(0) from SensorScopes where username=@userName
                and State=1  and datediff(ss,updateTime,getdate()) < 300

                select @fixedCount = count(0) from SensorScopes where username=@userName
                and State=2
                
                select @offlineCount as OfflineCount,@onlineCount as OnlineCount,@warningCount as AlarmDeviceCount,@normalCount as NormalCount, @fixedCount as UnderFixCount
            ";

            using (IDbConnection db = MemberConnection)
            {
                return db.QueryFirst<DeviceStatsModel>(tsql, new { userName = username });
            }
        }

        public PowerStatsModel GetPowerStats(string userName)
        {
            PowerStatsModel model = new PowerStatsModel();
            var sensorIds = GetSensorIdsByUser(userName);
            model.TodayData = PaddingHours(GetTodayPower(sensorIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '时'), Value = c.Value }).ToArray();
            model.MonthData = PaddingDays(GetCurrentMonthPower(sensorIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '日'), Value = c.Value }).ToArray();
            model.LastMonthData = PaddingDays(GetLastMonthPower(sensorIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '日'), Value = c.Value }).ToArray();
            model.YearData = PaddingMonths(GetCurrentYearPower(sensorIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '月'), Value = c.Value }).ToArray();
            model.LastYearData = PaddingMonths(GetLastYearPower(sensorIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '月'), Value = c.Value }).ToArray();
            return model;
        }

        
        //获取当日电量
        BarItemObject[] GetTodayPower(string[] sensorIds)
        {
            return powerRep.GetPowerByDay(sensorIds, DateTime.Now);
        }

      

        //获取当月电量， 上月电量
        BarItemObject[] GetCurrentMonthPower(string[] sensorIds)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                -- 获取本月用电量
                select day(createDate) as k,sum(value) as value from [power.hours] 
                where Year(createdate) = Year(CURRENT_TIMESTAMP) and Month(createDate) = Month(CURRENT_TIMESTAMP)
                and {0}
                group by Day(createDate)
            ", getPowerWhere(sensorIds)); ;
            return ExecuteSQL(tsql);
        }

        BarItemObject[] GetLastMonthPower(string[] sensorIds)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
            -- 获取上月用电量
                SELECT day(createDate) as k,sum(value) as value
                FROM [power.hours]
                WHERE DATEPART(m, createDate) = DATEPART(m, DATEADD(m, -1, getdate()))
                AND DATEPART(yyyy, createDate) = DATEPART(yyyy, DATEADD(m, -1, getdate()))
                and {0}
                group by Day(createDate)
            ", getPowerWhere(sensorIds)); ;
            return ExecuteSQL(tsql);
        }

       
        //获取当年电量，上年电量
        BarItemObject[] GetCurrentYearPower(string[] sensorIds)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
            --获取本年用电量
                select month(createDate) as k,sum(value) as value from [power.hours] where Year(createdate) = Year(CURRENT_TIMESTAMP) 
                and {0}
                group by month(createDate)
            ", getPowerWhere(sensorIds));
            return ExecuteSQL(tsql);
        }

        private string getPowerWhere(string[] sensorIds)
        {
            return string.Format(" sensorId in ({0})", string.Join(",", sensorIds.Select(c => "'" + c + "'")));
        }

        BarItemObject[] GetLastYearPower(string[] sensorIds)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
            --获取去年用电量
            select month(createDate) as k,sum(value) as value from [power.hours] where Year(createdate) = Year(CURRENT_TIMESTAMP) -1
            and {0}
            group by month(createDate)
            ", getPowerWhere(sensorIds));
            return ExecuteSQL(tsql);
        }
    }

}