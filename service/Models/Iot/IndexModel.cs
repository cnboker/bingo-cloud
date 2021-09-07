using System;
using System.Linq;

namespace Ioliz.Service.Models
{
    public class IndexModel
    {
        public PowerStatsModel PowerStats { get; set; }
        public DeviceStatsModel DeviceStats { get; set; }
        public WorkTimeStatsModel workTimeStats {get;set;}
        public ExceptionHandlerStatsModel ExceptionHandlerStats { get; set; }

    }

    public class WorkTimeStatsModel
    {
        //设备总工作时长
        public decimal WorkAllTimeDuration { get; set; }
        //故障处理总时长
        public decimal ErrorHandleTimeDuration { get; set; }
        //平均故障处理耗时
        public decimal ErrorHandleAverageTimeDuration { get; set; }
    }

    public class ExceptionHandlerStatsModel
    {
        //未处理设备数量
        public int UnhandleCount { get; set; }
        //设备处理中数量
        public int HandlingCount { get; set; }
        //已处理待确认数量
        public int WaitingConfirmCount { get; set; }

    }

    public class DeviceStatsModel
    {
        //在线设备数量
        public int OnlineCount { get; set; }
        //离线设备数量
        public int OfflineCount { get; set; }
        //警告设备数量
        public int AlarmDeviceCount { get; set; }
        //报修设备数量
        public int UnderFixCount { get; set; }
        //正常设备数量
        public int NormalCount { get; set; }
       
    }

    public class BarItemObject
    {
       public string Key {get;set;}
        public int K { get; set; }
        public string Value { get; set; }
        //第二值
        public string Value1 {get;set;}

    }

    public class PowerStatsModel
    {
        //当日用电量
        public BarItemObject[] TodayData { get; set; }
        //当月用电量
        public BarItemObject[] LastMonthData { get; set; }
        //上月用电量
        public BarItemObject[] LastYearData { get; set; }
        public BarItemObject[] MonthData { get; set; }
        public BarItemObject[] YearData { get; set; }

        public decimal TodayTotal
        {
            get
            {
                return TodayData.Select(k => Convert.ToDecimal(k.Value)).Sum();
            }
        }
        public decimal MonthTotal
        {
            get
            {
                return MonthData.Select(k => Convert.ToDecimal(k.Value)).Sum();
            }
        }
        public decimal LastMonthTotal
        {
            get
            {
                return LastMonthData.Select(k => Convert.ToDecimal(k.Value)).Sum();
            }
        }
        public decimal LastYearTotal
        {
            get
            {
                return LastYearData.Select(k => Convert.ToDecimal(k.Value)).Sum();
            }
        }

        public decimal YearTotal
        {
            get
            {
                return YearData.Select(k => Convert.ToDecimal(k.Value)).Sum();
            }
        }

    }

    public class ChartItemModel
    {
        public int Key { get; set; }
        public int Value { get; set; }
    }

}