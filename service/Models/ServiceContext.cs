using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace Ioliz.Service.Models
{
    public class ServiceContext : DbContext
    {
        public ServiceContext(DbContextOptions<ServiceContext> options)
          : base(options)
        { }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            //optionsBuilder.UseInMemoryDatabase("Servicedb");

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
        public DbSet<SensorConfig> SensorConfigs { get; set; }

        public DbSet<Topic> Topics { get; set; }
        public DbSet<SensorRemoteControl> SensorRemoteControls { get; set; }
        public DbSet<SensorSpecialConfig> SensorSpecialConfigs { get; set; }
        public DbSet<SensorScope> SensorScopes { get; set; }
        public DbSet<SensorScopeDetail> SensorScopeDetails { get; set; }
        public DbSet<RepairApply> RepairApplies { get; set; }
        public DbSet<SIMInfo> SIMInfos { get; set; }
        public DbSet<PreService> PreServices { get; set; }
        public DbSet<SensorFaultApplyView> SensorFaultApplyViews { get; set; }
        public DbSet<SensorModel> SensorModels {get;set;}
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<SensorFaultApplyView>(
              eb =>
              {
                  eb.HasNoKey();
                  eb.ToView("sensorFaultApplyView");
                  // eb.Property(v => v.SensorId).HasColumnName("DeviceId");
                  // eb.Property(v => v.Name).HasColumnName("DeviceName");
              }
            );
        }
    }

    public class SensorModel
    {
        public int Id { get; set; }
        public string DeviceId { get; set; }
        public string SensorId { get; set; }
        public string Name { get; set; }
        public string Model { get; set; }
        public string UserName {get;set;}
    }

    //设备状态表
    public class SensorScope
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public string Factory { get; set; }
        //设备Id
        public string SensorId { get; set; }

        //更新时间
        public DateTime? UpdateTime { get; set; }
        //报修时间
        public DateTime? ApplyTime {get;set;}
        //网络状态
        public NetworkStateEnum? NetworkState { get; set; }
        //设备状态：告警， 维修中，正常
        public DeviceStateEnum? State { get; set; }
        //无， 自行处理， 智能处理，
        public HandleMethodEnum? HandleMethod { get; set; }

        public HandleStepEnum? HandleStep { get; set; }

    }

    public class SensorScopeDetail
    {
        public int Id { get; set; }
        public int ParentId { get; set; }
        //操作用户
        public string UserName { get; set; }
        public HandleStepEnum HandleStep { get; set; }
        public DateTime CreateDate { get; set; }
        public string Remark { get; set; }
    }

    public class SIMInfo
    {
        public int Id { get; set; }
        //客户名称
        public string CustomerName { get; set; }

        //接入号码
        public string Number { get; set; }
        //
        public string ICCID { get; set; }
        //套餐名称
        public string Name { get; set; }
        //价格
        public decimal Price { get; set; }
        //缴费月份
        public int PayMonth { get; set; }
        //合计
        public decimal Total { get; set; }
        //上传日期
        public DateTime UploadDate { get; set; }
        //是否已绑定
        public bool IsBinding { get; set; }
    }

    public class SensorFaultApplyView
    {
        public int Id { get; set; }
        //tbl_message
        public int? Status { get; set; }
        //tbl_message
        public DateTime? CreateDate { get; set; }
        //tbl_message
        public string Message { get; set; }
        public string Name { get; set; }
        public string SensorId { get; set; }
        //申请人
        public string Applyer { get; set; }
        //申请日期
        public DateTime? ApplyDate { get; set; }
        //受理人
        public string Accepter { get; set; }
        //受理日期
        public DateTime? AcceptDate { get; set; }
        //受理人已完成待确认
        public DateTime? FactoryFinisheddDate { get; set; }
        //申请人确认完成日期
        public DateTime? FinishedDate { get; set; }
        //0:申请未处理， 1.已受理， 2. 处理已完成， 3. 已确认
        public HandleStepEnum ApplyState { get; set; }
        //处理方式
        public HandleMethodEnum HandleMethod { get; set; }
        //故障传感器,转速，温度， 电压 。。。
        public string FaultPoint { get; set; }
        //概述
        public string Title { get; set; }
        //详细描述
        public string DeSc { get; set; }
        //上传照片
        public string Images { get; set; }

        //催单次数
        public int RemenderCount { get; set; }
        //上次催单时间
        public DateTime? LastRemenderTime { get; set; }
    }
    //报修申请单
    public class RepairApply
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string SensorId { get; set; }
        //申请人
        public string Applyer { get; set; }
        //申请日期
        public DateTime ApplyDate { get; set; }
        //受理人
        public string Accepter { get; set; }
        //受理日期
        public DateTime? AcceptDate { get; set; }
        //工厂完成时间
        public DateTime? FactoryFinisheddDate { get; set; }
        //申请人确认完成时间
        public DateTime? FinishedDate { get; set; }
        //0:申请未处理， 1.已受理， 2. 处理已完成， 3. 已确认
        public HandleStepEnum? ApplyState { get; set; }
        //处理方式
        public HandleMethodEnum? HandleMethod { get; set; }
        //故障传感器,转速，温度， 电压 。。。
        public string FaultPoint { get; set; }
        //概述
        public string Title { get; set; }
        //详细描述
        public string DeSc { get; set; }
        //上传照片
        public string Images { get; set; }

        //催单次数
        public int RemenderCount { get; set; }
        //上次催单时间
        public DateTime? LastRemenderTime { get; set; }
    }



    public class NetTrafficInfo
    {
        public int Id { get; set; }
        public string TenantUserName { get; set; }
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
        public string InstanceName { get; set; }
        //domain
        public string Server { get; set; }
        //api domain
        public string ApiServer { get; set; }
        public string TenantUserName { get; set; }
        public string DatabaseName { get; set; }
        public string Resource { get; set; }
        public DateTime CreateDate { get; set; }
        //服务是否已经初始化
        public bool IsInitialize { get; set; }
        //是否是试用会员
        public bool IsTrial { get; set; }
    }

    public class PreService
    {
        public int Id { get; set; }
        public string ServiceNo { get; set; }
        public string Name { get; set; }
        public string Mobile { get; set; }
        public string Address { get; set; }
        public DateTime CreateDate { get; set; }
        public DateTime PaidDate { get; set; }
        public string Remark { get; set; }
        public bool IsPaid { get; set; }
        public decimal Amount { get; set; }
    }

    public class MyOrder
    {
        public int Id { get; set; }
        //服务实例名称
        public string InstanceName { get; set; }
        public decimal Price { get; set; }
        public string OrderNo { get; set; }
        public string TenantUserName { get; set; }
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
        public string Certification { get; set; }
        public DateTime? ActivationdDate { get; set; }
        public int ValidDays { get; set; }
        public string TenantUserName { get; set; }
        public string DeviceId { get; set; }
        public Device Device { get; set; }
        //远程节目发布系统API接口
        public string ApiUrl { get; set; }
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
        //public int Id { get; set; }
        public string DeviceId { get; set; }
        public string Name { get; set; }
        public string OS { get; set; }
        public string Resolution { get; set; }
        public string MAC { get; set; }
        public string IP { get; set; }
        public DeviceStatus Status { get; set; }
        public DateTime? LastUpdateTime { get; set; }
        // public string ServerName { get; set; }
        public string TenantUserName { get; set; }
        //授权状态
        public AuthorizeStatus? AuthorizeStatus { get; set; }
        //授权代码
        public string AuthorizeCode { get; set; }
        public DateTime? AuthorizeDate { get; set; }

        public int? CurrentLicenseId { get; set; }
        //关联传感器代码
        public string SensorCode { get; set; }
        //设备分组
        public string GroupName { get; set; }
        public bool? IsVM { get; set; }
        public DateTime? UpdateDate { get; set; }
        public String LatLng { get; set; }
    }

    public class SensorRemoteControl
    {
        [Key]
        public string SensorId { get; set; }
        public string Data { get; set; }
    }

    public class SensorConfig
    {
        public int Id { get; set; }
        public string TenantUserName { get; set; }
        //温度预警设置 config->alarm
        public string Threshold { get; set; }
        //逗号分隔
        //public string SensorIds { get; set; }
        //风机温度默认配置数据--config->temp
        public string FanConfig { get; set; }
        //系统设置数据
        public string SystemConfig { get; set; }

        //监控表格缓存数据
        public string DeviceCacheData { get; set; }

        //传感器型号和设备关联数据
        public string FanModel { get; set; }
        //设备组数据
        public string MainConfig { get; set; }
        //恢复上一次配置
        public string History { get; set; }
        //用户自定义传感器名称数据[{key,value}]
        public string SensorPropsLabelData { get; set; }
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

    //环控设备传感器配置表， 可以配置哪些已安装，哪些未安装
    public class SensorSpecialConfig
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        //配置内容
        public string Content { get; set; }
        public string Group { get; set; }
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
    public enum DeviceStatus
    {
        Offline,
        Failure,
        Running
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