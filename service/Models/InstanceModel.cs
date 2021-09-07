using System;

namespace Ioliz.Service.Models{

  public class InstanceModel:BaseInstanceModel{
    public  string InstanceName {get;set;}
    public string Server {get;set;}
    public string ApiServer {get;set;}
    public DateTime? CreateDate {get;set;}
    public int LicenseCount {get;set;}
    public int AvailiableLicenseCount {get;set;}
    public int UsedLicenseCount {get;set;}
    //快到期的许可
    public int WillExpiredCount {get;set;}
    public bool IsInitialize {get;set;}
    public bool IsTrial {get;set;}
    public int TrialCount {get;set;}
    //未付款订单id
    //public int UnPaidServiceId {get;set;}
  }

  public class BaseInstanceModel{
    //public bool InstanceAvailiable {get;set;}
    public bool IsCreateService {get;set;}
    public bool IsPaid {get;set;}
    public string Remark {get;set;}
  }

  public class InstanceCreateModel{
    public string Server {get;set;}
    //是否是试用
    public bool IsTrial {get;set;}
  }
}