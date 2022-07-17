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

        public HomeRepository(IStringLocalizer localizer) : base(localizer)
        {

        }

        public IndexModel GetIndexModel(string userName)
        {
            IndexModel model = new IndexModel();
            
            model.BasicInfo = GetBasicInfomation(userName);
            model.BasicInfo.DeviceDataByM = PaddingMonths(GetDeviceDataByM(userName));
            model.BasicInfo.LicenseDataByM = PaddingMonths(GetLicenseDataByM(userName));
            model.DeviceLogsStats = GetDeviceLogsStats(userName);
            model.DeviceLogsStats.DeviceLogs = GetDeviceLogTop30(userName);
            model.PlayStats = GetPlayStats(userName);
            return model;
        }

        private BasicInfomation GetBasicInfomation(string userName)
        {
            var tsql = @"
            select 
            --(select count(0) from Devices where userName=@userName and status=0) as offlineCount,
            --(select count(0) from Devices where userName=@userName and status=1) as onlineCount,
            (select count(0) from Licenses where userName=@userName ) as licenseCount,
            (select count(0) from Licenses where userName=@userName and status=0) as availiableLicenceCount
            ";
           
            using (IDbConnection db = ServiceConnection)
            {
                return db.QuerySingle<BasicInfomation>(tsql, new { userName = userName });
            }
        }

        private BarItemObject[] GetDeviceDataByM(string userName)
        {
            var tsql = @"
            select count(0) as value, Month(authorizeDate) as `key` from Devices
            where userName=@userName and authorizeDate > MAKEDATE(year(now()), 1) group by Year(authorizeDate),Month(authorizeDate)            ";
            using (IDbConnection db = ServiceConnection)
            {
                return db.Query<BarItemObject>(tsql, new { userName = userName }).ToArray();
            }
        }


        private BarItemObject[] GetLicenseDataByM(string userName)
        {
            var tsql = @"
            select count(0) as value, Month(GenerateDate) as `key` from Licenses
            where userName=@userName and GenerateDate > MAKEDATE(year(now()), 1) group by Year(GenerateDate),Month(GenerateDate)            ";
            using (IDbConnection db = ServiceConnection)
            {
                return db.Query<BarItemObject>(tsql, new { userName = userName }).ToArray();
            }
        }


        //故障处理总耗时
        private DeviceLogsStats GetDeviceLogsStats(string userName)
        {
            var tsql = @"
           select (select sum(0) as total from DeviceLogs where Tenant=@userName) as a,
            (select sum(0)  from DeviceLogs where Tenant=@userName and LogType=2) as errorTotal,
            (select sum(0) from DeviceLogs where Tenant=@userName and createdate between curdate() and now()) as todayTotal ,
            (select sum(0)  from DeviceLogs where Tenant=@userName and LogType=2 and createdate between curdate() and now()) as todayErrorTotal
            ";
            using (IDbConnection db = ServiceConnection)
            {
                return db.QuerySingle<DeviceLogsStats>(tsql, new { userName = userName });
            }
        }

        private DeviceLog[] GetDeviceLogTop30(string userName)
        {
            var tsql = @"select * from DeviceLogs where Tenant=@userName order by createDate desc LIMIT 30 OFFSET 0 ";

            using (IDbConnection db = ServiceConnection)
            {
                return db.Query<DeviceLog>(tsql, new { userName = userName }).ToArray();
            }
        }

        private PlayStats GetPlayStats(string userName)
        {
            PlayStats model = new PlayStats();
            //2022-5
            model.MonthTitle = string.Format("{0}-{1}", DateTime.Now.Year, DateTime.Now.Month);
            //2022.1-2022.5
            model.YearTitle = string.Format("{0}.1-{0}.{1}", DateTime.Now.Year, DateTime.Now.Month);
            var deviceIds = GetDeviceIds(userName);
            model.MonthData = PaddingDays(GetMonthData(deviceIds, userName));
            //model.MonthDaysData = PaddingMonths(GetMonthDays(deviceIds));
            model.YearData = PaddingMonths(GetCurrentYear(deviceIds, userName));
            return model;
        }

        private string[] GetDeviceIds(string userName)
        {

            var sqlText = string.Format(@"
                    select deviceId
                    FROM Devices where userName =@userName");

            using (IDbConnection db = ServiceConnection)
            {
                var result = db.Query<string>(sqlText, new { userName = userName });

                return result.ToArray();
            }
        }

        //获取当月播放统计
        BarItemObject[] GetMonthData(string[] deviceIds, string userName)
        {
            if (deviceIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                -- 获取本月播放量统计
                select day(createDate) as `key`,sum(duration) as value from PlayRecords
                where Year(createdate) = Year(CURRENT_TIMESTAMP) and Month(createDate) = Month(curdate())
                and {0}
                and tenant=@userName
                group by Day(createDate)
            ", deviceIdsWhere(deviceIds)); ;
            using (IDbConnection db = ServiceConnection)
            {
                var result = db.Query<BarItemObject>(tsql, new { userName = userName });

                return result.ToArray();
            }
        }

        //获取当月每天播放时长
        BarItemObject[] GetMonthDays(string[] deviceIds, string userName)
        {
            if (deviceIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                select day(createDate) as `key`,sum(duration) as value from PlayRecords
                where Year(createdate) = Year(CURRENT_TIMESTAMP) and Month(createDate) = Month(curdate())
                and tenant=@userName
                and {0}
                group by Day(createDate)
            ", deviceIdsWhere(deviceIds)); ;
            using (IDbConnection db = ServiceConnection)
            {
                var result = db.Query<BarItemObject>(tsql, new { userName = userName });

                return result.ToArray();
            }
        }
        //得到上月播放统计
        BarItemObject[] GetLastMonth(string[] deviceIds)
        {
            if (deviceIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                -- 获取上月播放量统计
                SELECT day(createDate) as `key`,sum(duration) as value
                FROM PlayRecords
                WHERE Month(createDate) = Month(curdate())
                AND Year(createDate) = Year(curdate())
                and {0}
                group by Day(createDate)
            ", deviceIdsWhere(deviceIds));
            using (IDbConnection db = ServiceConnection)
            {
                var result = db.Query<BarItemObject>(tsql);

                return result.ToArray();
            }
        }


        //获取本年度播放量统计
        BarItemObject[] GetCurrentYear(string[] deviceIds, string userName)
        {
            if (deviceIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                select month(CreateDate) as `key`,sum(Duration) as value from PlayRecords where 
                tenant=@userName 
                and Year(CreateDate) = Year(curdate()) 
                and {0}
                group by month(createDate)
            ", deviceIdsWhere(deviceIds));
            Console.WriteLine("sql:" + tsql);
            using (IDbConnection db = ServiceConnection)
            {
                var result = db.Query<BarItemObject>(tsql, new { userName = userName });

                return result.ToArray();
            }
        }

        private string deviceIdsWhere(string[] deviceIds)
        {
            return string.Format("DeviceId in ({0})", string.Join(",", deviceIds.Select(c => "'" + c + "'")));
        }

    }

}