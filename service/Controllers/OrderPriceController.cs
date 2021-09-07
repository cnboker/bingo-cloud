using System;
using Ioliz.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Ioliz.Service.Controllers{

   [Authorize]
   [Route("api/[controller]")]
    public class ServicePriceController:Controller{
    public dynamic Get(){
      return new{
        price=AppInstance.Instance.Config.PricePerDay,
        discount = AppInstance.Instance.Config.Discount
      };
      
    }
  }
}