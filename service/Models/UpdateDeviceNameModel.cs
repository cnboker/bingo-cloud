using System;

namespace Ioliz.Service.Models{
  public class UpdateDeviceNameModel{
    public string DeviceId {get;set;}
    public string NewName {get;set;}
    public string SensorNo {get;set;}
    public string GroupName {get;set;}
    public string Resolution {get;set;}
    public string LatLng {get;set;}
  }

  public class SensorUpdateModel{
    public string SensorId {get;set;}
    public string Name {get;set;}
    public string GroupName {get;set;}
  }

  public class VMDeviceCreateModel{
    public int Quantity {get;set;}
  }
}