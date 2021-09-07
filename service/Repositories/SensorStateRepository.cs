using System;
using System.Linq;
using Ioliz.Service.Models;


namespace Ioliz.Service.Repositories
{
    public class SensorStateRepository : RepositoryBase
    {

        //drapper dependency
        public SensorStateRepository()
        {
        }

        //在线统计-日
        public BarItemObject[] GetSensorStateByDay(string userName, DateTime day)
        {
            string sql = @"
                select 
                    datepart(HOUR,createDate) as k,
                    LTRIM(datepart(HOUR,createDate)) + '时' as [key],
                    onlineCount as Value,
                    offlineCount as Value1
                 from [SensorState.Hours]
                 where createdate between @start and @end
                 and userName=@userName
            ";
            var result = ExecuteSQL(sql, new
            {
                userName = userName,
                start = DateTime.Parse(day.ToShortDateString()),
                end = DateTime.Parse(day.ToShortDateString() + " 23:59:59")
            });
            return PaddingHours(result);
        }
        //在线统计-月
        public BarItemObject[] GetSensorStateByMonth(string userName, int year, int month)
        {
            DateTime start = new DateTime(year, month, 1);
            DateTime end = new DateTime(year, month, DateTime.DaysInMonth(year, month));
            string sql = @"
                select 
                   day(createDate) as k,
                   LTRIM(day(createDate)) + '日' as [key],
                    onlineCount as Value,
                    offlineCount as Value1
                 from [SensorState.Days]
                 where createdate between @start and @end
                 and userName=@userName
            ";
            var result = ExecuteSQL(sql, new
            {
                userName = userName,
                start = start,
                end = end
            });
            return PaddingDays(result);
        }
        //在线统计-年
        public BarItemObject[] GetSensorStateByYear(string userName, int year)
        {
            DateTime start = new DateTime(year, 1, 1);
            DateTime end = new DateTime(year, 12, DateTime.DaysInMonth(year, 12));
            string sql = @"
                select 
                month(createDate) as k,
                LTRIM(month(createDate)) + '月' as [key],
                (sum(onlineCount)/count(0)) as Value,
                (sum(offlineCount)/count(0)) as Value1
                 from [SensorState.Days]
                 where createdate between @start and @end
                 and userName=@userName
                 group by month(createDate)
            ";
            var result = ExecuteSQL(sql, new
            {
                userName = userName,
                start = start,
                end = end
            });
            return PaddingMonths(result);
        }


    }
}