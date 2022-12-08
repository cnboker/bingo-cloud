using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Ioliz.Service.Models
{
    public class ServiceContext : DbContext
    {
        public ServiceContext(DbContextOptions<ServiceContext> options)
          : base(options)
        { }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
        }

        public DbSet<MyOrder> Orders { get; set; }
        public DbSet<License> Licenses { get; set; }
        public DbSet<Device> Devices { get; set; }
        public DbSet<KeyValue> KeyValues { get; set; }
        public DbSet<Instance> Instances { get; set; }
        public DbSet<BenefitCode> BenefitCodes { get; set; }
        public DbSet<UserAccount> UserAccounts { get; set; }
        public DbSet<AccountDetail> AccountDetails { get; set; }

        public DbSet<ApplicationUserExtender> ApplicaitonUserExtenders { get; set; }

        public DbSet<NetTrafficInfo> NetTrafficInfos { get; set; }

        public DbSet<Topic> Topics { get; set; }
        public DbSet<DeviceLog> DeviceLogs {get;set;}
        public DbSet<PlayRecord> PlayRecords {get;set;}
    }

    //终端播放记录
    public class PlayRecord {
        public int Id {get;set;}
        public string Tenant {get;set;}
        public string DeviceId {get;set;}
        public DateTime StartPlayTime {get;set;}
        public DateTime EndPlayTIme {get;set;}
        public string PlayFileName {get;set;}
        //播放时长
        public int Duration {get;set;}
        public DateTime CreateDate {get;set;}
    }

    public class DeviceLog {
        public int Id {get;set;}
        public string Tenant { get; set; }
        public string DeviceName {get;set;}
        public string DeviceId {get;set;}
        public LogType LogType {get;set;}
        public string Remark {get;set;}
        public DateTime? CreateDate {get;set;}
    }

    public class NetTrafficInfo
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public string DeviceId { get; set; }
        public string DeviceName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public long BytesReceived { get; set; }
        public string NetworkInterfaceType { get; set; }
        public long Speed { get; set; }
        public long BytesSent { get; set; }
        public bool IsNetworkOnline { get; set; }
    }

    public class ApplicationUserExtender
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        //当前账号的二级代理商名称
        public string AgentUser { get; set; }
        //该账号是否是二级帐号
        public bool IsAgent { get; set; }
    }

    public class BenefitCode
    {
        public int Id { get; set; }
        //优惠码
        public string Code { get; set; }
        //创建日期
        public DateTime? CreateDate { get; set; }
        //使用日期
        public DateTime? UsedDate { get; set; }
        //创建用户
        public string Creator { get; set; }
        //消费用户
        public string Consumer { get; set; }
        //已使用
        public bool IsUsed { get; set; }
        //已转账给推荐人
        public bool IsPaid { get; set; }
        //佣金金额
        public decimal Commission { get; set; }
    }

    public class Instance
    {
        public int Id { get; set; }
        //实例名称
        public string FileServer { get; set; }
        public string MQTTServer {get;set;}
        public string UserName { get; set; }
        public DateTime CreateDate { get; set; }
        //是否是试用会员
        public bool IsTrial { get; set; }
    }

    
    public class MyOrder
    {
        public int Id { get; set; }
        //服务实例名称
        public string InstanceName { get; set; }
        public decimal Price { get; set; }
        public string OrderNo { get; set; }
        public string UserName { get; set; }
        public decimal Amount { get; set; }
        //订单小记
        public decimal SubTotal { get; set; }
        //license数量
        public int LicenseCount { get; set; }
        //有效天数
        public int ValidDays { get; set; }
        //付款方式
        public PayMethod PayMethod { get; set; }
        public bool IsPaid { get; set; }
        public string Remark { get; set; }
        public DateTime? CreateDate { get; set; }

        public DateTime? PayDateTime { get; set; }
        //优惠代码（推荐码在系统里面必须唯一)
        public string BenifitCode { get; set; }
        //推荐人名称
        public string RecommandUserName { get; set; }
        //折扣
        public decimal Discount { get; set; }
        //推荐人佣金
        public decimal Commission { get; set; }
    }

    //账单资金账户
    public class UserAccount
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public decimal Balance { get; set; }
    }
    //账单资金明细
    public class AccountDetail
    {
        public int Id { get; set; }
        public decimal BeforeBalance { get; set; }
        //入账用户
        public string UserName { get; set; }
        //出帐用户
        public string FromUserName { get; set; }
        public decimal AfterBalance { get; set; }
        public decimal Amount { get; set; }
        public string OrderNo { get; set; }
        public string Remark { get; set; }
        public DateTime TransTime { get; set; }
        public TransType TransType { get; set; }
    }

    public enum TransType
    {
        Order,
        Commissoion
    }
    public class License
    {
        public int Id { get; set; }
        public DateTime? GenerateDate { get; set; }
        public LicenseType LicenseType { get; set; }
        public DateTime? ActivationdDate { get; set; }
        public int ValidDays { get; set; }
        public string UserName { get; set; }
        public string DeviceId { get; set; }
        public Device Device { get; set; }
        public LicenseStatus Status { get; set; }
    }

    public enum LicenseStatus
    {
        //未激活
        InActive,
        //已激活
        Active,
        //已失效
        Expired
    }
    public class Device
    {
        public string DeviceId { get; set; }
        public string Name { get; set; }
        public string OS { get; set; }
        public string OS_Ver {get;set;}
        public string Resolution { get; set; }
        public string MAC { get; set; }
        public string IP { get; set; }
        
        public DateTime? LastUpdateTime { get; set; }
        // public string ServerName { get; set; }
        public string UserName { get; set; }
        //授权状态
        public AuthorizeStatus? AuthorizeStatus { get; set; }
        //授权代码
        public string AuthorizeCode { get; set; }
        public DateTime? AuthorizeDate { get; set; }
       
        //设备分组
        public string GroupName { get; set; }
       
        public DateTime? UpdateDate { get; set; }
        public String LatLng { get; set; }
        public int CurrentLicenseId {get;set;}

        public string ActivateCode {get;set;}
    }

    //用户数据字典
    public class Topic
    {
        public int Id { get; set; }
        //json array string
        public string Content { get; set; }
        public string UserName { get; set; }

        public TopicCatelog Catelog { get; set; }
    }

    

    //数据字典类别
    public enum TopicCatelog
    {
        //风机类型
        SensorModel,
        //Device group, relate to userName
        DeviceGroup,
        //PWD基础数据配置
        PWMConfig,
        //主控板类型
        BoardInfo,
        //SensorModel与BoardModel组合对象
        DeviceInfo
    }
    public enum AuthorizeStatus
    {
        //设备信息刚上传， 未做任何处理
        Initail,
        Allow = 1,
        Reject = 2
    }
    public class KeyValue
    {

        // type
        [Key]
        public int Id { get; set; }
        //public int KeyValueType { get; set; }
        public string Key { get; set; }
        public string Value { get; set; }
    }
    public enum NetworkStatus
    {
        Offline = 0,
        Running = 1
    }
    public enum LicenseType
    {
        //试用
        Trial,
        //正式
        Formal,
        //出厂许可，出厂许可没有年限限制，出厂许可的终端可以用别的账号重新激活设备入网运行
        Factory
    }
    public enum PayMethod
    {
        Weixin = 1,
        Paypay = 2,
        //免单
        Free = 3
    }

    public enum KeyValueType
    {
        //单设备每天服务价格
        PricePerDay = 1,
        //试用天数
        TrialDays,
        //最大试用设备数
        TrialMaxDeviceCount,
        //推荐用户商户折扣比例
        Discount,
        //推荐人佣金比例
        CommissionRate,
        //试用会员最大上传视频尺寸
        TrialMaxUploadVideoFileSize,
        //试用会员节目最大使用图片数量
        TrialMaxUsePictureCount,
        //每天创建优惠码数量
        MaxBenefitCountByDay,
        //单台服务器最大实例数
        MaxInstance,
        //设备许可过期无法获取可用许可后，设备正常运行天数
        LicneseExpiredDeviceAvailiableDays,
        //代理商许可天数
        AgentLicenseDays,
        //4G Quota
        Quota4G,
        //风扇预警阀值
        FanAlarmThreshold,
        //温度预警阀值
        TempAlarmThreshold,
        //电压预警阀值
        PowerAlarmThreshold,
        //
        FanMotorAlarmThreshold,
        //风机型号数据，用,分割
        FanMotorModelInfo
    }
}