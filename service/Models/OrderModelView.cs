using System;
using Ioliz.Service.Models;

namespace Ioliz.Service.Models {
  public class OrdersModelView{
    public int Count {get;set;}
    public int Days {get;set;}
    public PayMethod PayMethod {get;set;}
    //优惠码
    public string Code {get;set;} 
  }

}