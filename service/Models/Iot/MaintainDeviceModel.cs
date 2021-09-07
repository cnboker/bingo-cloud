using System;

namespace Ioliz.Service.Models
{
  
  public enum DeviceStateEnum{
    //正常
    Normal=0,
    //警告
    Warning=1,
    //维修中
    Handling=2,
    
  }
  public enum NetworkStateEnum{
    Offline,
    Online
  }

  public enum HandleMethodEnum {
    None,
     //工单处理
    ServiceFixed = 1,
    //自行处理
    SelfFixed = 2,
    //智能处理
    AutoFixed = 3,
   
  }
  public enum HandleStepEnum{
    //未完成请求，包括pending, accepted,handled
    InComplete = 0,
    //报修单已提交未确认
    Pending = 1,
    //工厂已确认
    Accepted = 2,
    //工厂已处理
    Handled = 3,
    //客户已确认维修完成
    UserAccepted = 4
  }

  //报修申请单
  public class RepairApplyModel {
    //申请人
    public string Applyer {get;set;}
    //申请日期
    public DateTime ApplyDate {get;set;}
    //受理人
    public string Accepter {get;set;}
    //受理日期
    public DateTime AcceptDate {get;set;}
    //受理人已完成待确认
    public DateTime AccepterFinishedDate {get;set;}
    //申请人确认完成日期
    public DateTime ApplyerConfirmDate {get;set;}
    //0:申请未处理， 1.已受理， 2. 处理已完成， 3. 已确认
    public int ApplyState {get;set;}
    //处理方式
    public int HanleMethod {get;set;}
    //故障传感器,转速，温度， 电压 。。。
    public int FaultPoint {get;set;}
    //概述
    public string Remark {get;set;}
    //详细描述
    public string Detail {get;set;}
    //上传照片
    public string[] Images {get;set;}

    //催单次数
    public int RemenderCount {get;set;}
    //上次催单时间
    public DateTime LastRemenderTime {get;set;}
  }
}