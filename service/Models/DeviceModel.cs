using System;

namespace Ioliz.Service.Models{

  public class DeviceModel{
    public string DeviceId {get;set;}
    public string Name {get;set;}
    public string MAC {get;set;}
    public string IP {get;set;}
    
    public bool? licenseExpired {get;set;}
    //public DateTime ExpiredDate {get;set;}
    public string LicenseRemark {get;set;}
    public int? ValidDays {get;set;}
    public DateTime ActivationdDate {get;set;}
    public string UserName {get;set;}
    public string GroupName {get;set;}
    public string Resolution {get;set;}
    public string OS {get;set;}
    public string LatLng {get;set;}
    public int NetworkStatus {get;set;}
  }
}