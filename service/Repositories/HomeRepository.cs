using System;
using System.Linq;
using Ioliz.Service.Models;
using System.Data;
using Dapper;
using Microsoft.Extensions.Localization;

namespace Ioliz.Service.Repositories
{
    public class HomeRepository : RepositoryBase
    {
        public string userName;
        public HomeRepository(IStringLocalizer localizer,string userName):base(localizer)
        {
            this.userName = userName;
        }

        public IndexModel GetIndexModel(){
            IndexModel model = new IndexModel();
            model.BasicInfo = GetBasicInfomation();
            model.DeviceLogsStats = GetDeviceLogsStats();
            model.PlayStats = GetPlayStats();
            return model;
        }

        private BasicInfomation GetBasicInfomation()
        {
            var tsql = @"
            select 
            (select count(0) from Devices where userName=@userName and status=0) as offlineCount,
            (select count(0) from Devices where userName=@userName and status=1) as onlineCount,
            (select count(0) from licenses where userName=@userName ) as licenseCount,
            (select count(0) from licenses where userName=@userName and status=0) as availiableLicenceCount
            ";
            using (IDbConnection db = MemberConnection)
            {
                return db.QuerySingle<BasicInfomation>(tsql, new { userName = userName });
            }
        }
    
        //故障处理总耗时
        private DeviceLogsStats GetDeviceLogsStats()
        {
            var tsql = @"
            select
            (select sum(0) as total from DeviceLog where userName=@userName),
            (select sum(0) as errorTotal from DeviceLog where userName=@userName and status=2),
            (select sum(0) as todayTotal from DeviceLog where userName=@userName and createdate between (curdate() and now())),
            (select sum(0) as TodayErrorTotal from DeviceLog where userName=@userName and status=2 and createdate between (curdate() and now())),
            (select sum(0) as FixedCount from DeviceLog where userName=@userName and fixed=1),
            (select top 30 * from Device where username=@userName order by createDate desc) as DeviceLogs
            ";
            using (IDbConnection db = MemberConnection)
            {
                return db.QuerySingle<DeviceLogsStats>(tsql, new { userName = userName });
            }
        }

        private PlayStats GetPlayStats()
        {
            PlayStats model = new PlayStats();
            model.MonthTitle = "1";
            model.YearTitle = "";
            var deviceIds = GetDeviceIds(userName);
            model.MonthData = PaddingDays(GetMonthData(deviceIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '时'), Value = c.Value }).ToArray();
            model.LastMonthData = PaddingDays(GetLastMonth(deviceIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '日'), Value = c.Value }).ToArray();
            model.YearData = PaddingMonths(GetCurrentYear(deviceIds)).Select(c => new BarItemObject() { Key = (c.K.ToString() + '月'), Value = c.Value }).ToArray();
            return model;
        }

        private string[] GetDeviceIds(string userName)
        {
            
            var sqlText = string.Format(@"
                    select deviceId
                    FROM devices where userName =@userName");

            using (IDbConnection db = MemberConnection)
            {
                var result = db.Query<string>(sqlText, new { userName = userName });

                return result.ToArray();
            }
        }

        
        //获取当日电量
        // BarItemObject[] GetTodayPower(string[] deviceIds)
        // {
        //     var tsql = string.Format(@"
        //         -- 获取单日电量
              
        //         --set @start = cast(getdate() as date)
        //         --set @end = getdate()
        //         select LTRIM(datepart(HOUR,createdate)) + '时' as [key], datepart(HOUR,createdate) as K, sum(value) as value from [power.hours]
        //         where createdate between @start and @end
        //         and {0}
        //         group by  createdate
        //     ", deviceIdsWhere(deviceIds)); ;
        //     var result = ExecuteSQL(tsql, new
        //     {
        //         start = DateTime.Parse(day.ToShortDateString()),
        //         end = DateTime.Parse(day.ToShortDateString() + " 23:59:59")
        //     });
        //     return PaddingHours(result);
        // }

    
        //获取当月播放统计
        BarItemObject[] GetMonthData(string[] deviceIds)
        {
            var tsql = string.Format(@"
                -- 获取本月播放量统计
                select day(createDate) as k,sum(duration) as value from [playRecords] 
                where Year(createdate) = Year(CURRENT_TIMESTAMP) and Month(createDate) = Month(CURRENT_TIMESTAMP)
                and {0}
                group by Day(createDate)
            ", deviceIdsWhere(deviceIds)); ;
            return ExecuteSQL(tsql);
        }

        //得到上月播放统计
        BarItemObject[] GetLastMonth(string[] deviceIds)
        {
            if (deviceIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                -- 获取上月播放量统计
                SELECT day(createDate) as k,sum(duration) as value
                FROM [playrecords]
                WHERE DATEPART(m, createDate) = DATEPART(m, DATEADD(m, -1, getdate()))
                AND DATEPART(yyyy, createDate) = DATEPART(yyyy, DATEADD(m, -1, getdate()))
                and {0}
                group by Day(createDate)
            ", deviceIdsWhere(deviceIds)); ;
            return ExecuteSQL(tsql);
        }

       
        //获取当年电量
        BarItemObject[] GetCurrentYear(string[] deviceIds)
        {
            if (deviceIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                --获取本年度播放量统计
                select month(createDate) as k,sum(duration) as value from [playrecords] where Year(createdate) = Year(CURRENT_TIMESTAMP) 
                and {0}
                group by month(createDate)
            ", deviceIdsWhere(deviceIds));
            return ExecuteSQL(tsql);
        }

        private string deviceIdsWhere(string[] deviceIds)
        {
            return string.Format(" deviceId in ({0})", string.Join(",", deviceIds.Select(c => "'" + c + "'")));
        }

        // BarItemObject[] GetLastYearPower(string[] deviceIds)
        // {
        //     if (deviceIds.Length == 0) return new BarItemObject[] { };
        //     var tsql = string.Format(@"
        //     --获取去年用电量
        //     select month(createDate) as k,sum(value) as value from [power.hours] where Year(createdate) = Year(CURRENT_TIMESTAMP) -1
        //     and {0}
        //     group by month(createDate)
        //     ", deviceIdsWhere(deviceIds));
        //     return ExecuteSQL(tsql);
        // }
    }

}