using System;
using Ioliz.Service.Models;
using System.Linq;

namespace Ioliz.Service.Repositories
{
    public class PowerRepository : RepositoryBase
    {

        //获取月电量
        public BarItemObject[] GetMonthPower(string[] sensorIds, int year, int month)
        {
            DateTime start = new DateTime(year, month, 1);
            DateTime end = new DateTime(year, month, DateTime.DaysInMonth(year, month));
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                -- 获取本月用电量
                select day(createDate) as k,LTRIM(day(createDate))+'日' as [key],sum(value) as value from [power.days] 
                where createdate between @start and @end
                and {0}
                group by Day(createDate)
            ", getWhere(sensorIds)); ;
            var result = ExecuteSQL(tsql, new
            {
                start = start,
                end = end
            });
            return PaddingDays(result);
        }

        //获取天电量
        public BarItemObject[] GetPowerByDay(string[] sensorIds, DateTime day)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
                -- 获取单日电量
              
                --set @start = cast(getdate() as date)
                --set @end = getdate()
                select LTRIM(datepart(HOUR,createdate)) + '时' as [key], datepart(HOUR,createdate) as K, sum(value) as value from [power.hours]
                where createdate between @start and @end
                and {0}
                group by  createdate
            ", getWhere(sensorIds)); ;
            var result = ExecuteSQL(tsql, new
            {
                start = DateTime.Parse(day.ToShortDateString()),
                end = DateTime.Parse(day.ToShortDateString() + " 23:59:59")
            });
            return PaddingHours(result);

        }

        //年电量
        public BarItemObject[] GetYearPower(string[] sensorIds, int year)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            DateTime start = new DateTime(year, 1, 1);
            DateTime end = new DateTime(year, 12, DateTime.DaysInMonth(year, 12));
            var tsql = string.Format(@"
            --获取本年用电量
                select month(createDate) as k, LTRIM(month(createDate))+'月' as [key], sum(value) as value from [power.days] 
                where createdate between @start and @end
                and {0}
                group by month(createDate)
            ", getWhere(sensorIds));
            var result = ExecuteSQL(tsql, new
            {
                start = start,
                end = end
            });
            return PaddingMonths(result);
        }

       
    }
}