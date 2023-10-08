using System;

namespace Ioliz.Service.Models{
  public class ApiResult{
    //0:ok,1:error
    public int Result {get;set;}
    public string Message {get;set;}
  }
}