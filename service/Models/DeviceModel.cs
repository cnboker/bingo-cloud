using System;

namespace Ioliz.Service.Models{

  public class DeviceModel{
    public string DeviceId {get;set;}
    public string Name {get;set;}
    public string MAC {get;set;}
    public string IP {get;set;}
    //设备状态资源url，数据从内容服务器获取
    public string StatusResourceUrl {get;set;}
    public bool licenseExpired {get;set;}
    //public DateTime ExpiredDate {get;set;}
    public string LicenseRemark {get;set;}
    public int? ValidDays {get;set;}
    public DateTime ActivationdDate {get;set;}
    public string TenantUserName {get;set;}
    public string SensorNo {get;set;}
    public string GroupName {get;set;}
    public bool? IsVM {get;set;}
    public string Resolution {get;set;}
    public string OS {get;set;}
    public string LatLng {get;set;}
  }
}