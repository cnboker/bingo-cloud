using System;
using System.Linq;
using Ioliz.Service.Models;


namespace Ioliz.Service.Repositories
{    
    public class MessageRepository : RepositoryBase
    {
        public MessageRepository(){}

          //获取月电量
        public BarItemObject[] GetMessageByMonth(string[] sensorIds, int year, int month)
        {
            DateTime start = new DateTime(year, month, 1);
            DateTime end = new DateTime(year, month, DateTime.DaysInMonth(year, month));
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"
               
                select day(createDate) as k,LTRIM(day(createDate))+'日' as [key],message as Value from [message.days] 
                where createdate between @start and @end
                and {0}
                --group by Day(createDate)
            ", getWhere(sensorIds)); ;
            var result = ExecuteSQL(tsql, new
            {
                start = start,
                end = end
            });
            return PaddingDays(result);
        }

        //获取天电量
        public BarItemObject[] GetMessageByDay(string[] sensorIds, DateTime day)
        {
            if (sensorIds.Length == 0) return new BarItemObject[] { };
            var tsql = string.Format(@"                                
                select LTRIM(datepart(HOUR,createdate)) + '时' as [key], datepart(HOUR,createdate) as K, message as Value from [message.hours]
                where createdate between @start and @end
                and {0}
            ", getWhere(sensorIds)); ;
            var result = ExecuteSQL(tsql, new
            {
                start = DateTime.Parse(day.ToShortDateString()),
                end = DateTime.Parse(day.ToShortDateString() + " 23:59:59")
            });
            return PaddingHours(result);

        }

        //年电量
        public BarItemObject[] GetMessageByYear(string[] sensorIds, int year)
        {
            return new BarItemObject[]{};
            // if (sensorIds.Length == 0) return new BarItemObject[] { };
            // DateTime start = new DateTime(year, 1, 1);
            // DateTime end = new DateTime(year, 12, DateTime.DaysInMonth(year, 12));
            // var tsql = string.Format(@"
            // --获取本年用电量
            //     select month(createDate) as k, LTRIM(month(createDate))+'月' as [key], message from [message.days] 
            //     where createdate between @start and @end
            //     and {0}
            //     group by month(createDate)
            // ", getWhere(sensorIds));
            // var result = ExecuteSQL(tsql, new
            // {
            //     start = start,
            //     end = end
            // });
            // return PaddingMonths(result);
        }

    }
}