using System;
using System.Linq;

namespace Ioliz.Service.Models
{
    public class IndexModel
    {
        public DeviceLogsStats DeviceLogsStats { get; set; }
        public BasicInfomation BasicInfo { get; set; }
        public PlayStats PlayStats { get; set; }
    }

    public class BasicInfomation
    {
        //设备总数
        public int OfflineCount { get; set; }
        //在线设备总数
        public int OnlineCount { get; set; }
        public int LicenseCount {get;set;}
        public int AvailiableLicenceCount {get;set;}
        //磁盘配额
        public int DiskQuota { get; set; }
        //可利用磁盘数
        public int AvailiableDisk { get; set; }
    }

    public class PlayStats
    {
        public string MonthTitle {get;set;}
        public string YearTitle {get;set;}
        //当月播放时长
        public BarItemObject[] MonthData { get; set; }
        public BarItemObject[] LastMonthData { get; set; }
        //年播放时长
        public BarItemObject[] YearData { get; set; }
    }

    public class DeviceLogsStats
    {
        //总日志数
        public int Total { get; set; }
         //错误总数
        public int ErrorTotal { get; set; }
        //今日日志
        public int TodayTotal { get; set; }
       
        //今日错误总数
        public int TodayErrorTotal { get; set; }
        //已修复总数
        public int FixedCount { get; set; }
       
        public DeviceLog[] DeviceLogs {get;set;}
    }

    public enum LogType {
        Information,
        Warnning,
        Error
    }
   
    public class BarItemObject
    {
        public string Key { get; set; }
        public int K { get; set; }
        public string Value { get; set; }
        //第二值
        public string Value1 { get; set; }

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