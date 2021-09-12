using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using Ioliz.Service.Models;
using Ioliz.Service.Repositories;
using Ioliz.Shared.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Ioliz.Service.Controllers
{
  [Route("/api/[controller]/[action]")]
  [Authorize()]
  public class OrdersController : BaseController
  {
    private readonly IConfiguration configuration;
    public OrdersController(ServiceContext ctx, ILogger<BaseController> logger, IConfiguration configuration) : base(ctx, logger)
    {
      this.configuration = configuration;
    }

    public IActionResult MyOrders(int id)
    {
      var userName = User.Identity.Name;
      var entity = ctx.Orders.FirstOrDefault(x => x.Id == id);
      if (entity == null) return BadRequest();
      return Json(entity);
    }

    [HttpDelete("/api/order/cancel/{id}")]
    public IActionResult Cancel(int id)
    {
      var userName = User.Identity.Name;
      var entity = ctx.Orders.FirstOrDefault(x => x.Id == id);
      if (entity == null) return BadRequest();
      if (entity.IsPaid)
      {
        return BadRequest("订单已付款");
      }
      ctx.Orders.Remove(entity);
      ctx.SaveChanges();
      return Json(entity);
    }

    [Authorize(Roles = "Administrators")]
    [HttpPost("/api/order/free/{id}")]
    public IActionResult Free(int id)
    {
      var userName = User.Identity.Name;
      var entity = ctx.Orders.FirstOrDefault(x => x.Id == id);
      if (entity == null) return BadRequest("Orders not exist");
      if (entity.IsPaid)
      {
        return BadRequest("订单已付款");
      }
      entity.Amount = 0;
      entity.Commission = 0;
      entity.Remark = "后台免单";
      ctx.SaveChanges();
      return Checkout(new PayModel()
      {
        Id = id,
        PayMethod = (int)PayMethod.Free
      });
    }

    [HttpPost("/api/order/list")]
    public IActionResult MyOrders([FromBody] OrderQuery query)
    {
      var userName = User.Identity.Name;
      var Orders = ctx.Orders.AsQueryable();
      if (string.IsNullOrEmpty(query.TanentName))
      {
        if (IsAgent())
        {
          // var configuration = this.HttpContext.RequestOrders.GetOrders(typeof(IConfiguration)) as IConfiguration;
          logger.LogInformation("configuration is not null," + (this.configuration != null));
          OrderRepository OrdersRep = new OrderRepository(this.configuration);
          var myTenants = OrdersRep.GetMyTenants(userName);
          Orders = Orders.Where(x => myTenants.Contains(x.TenantUserName) || x.TenantUserName == userName);
        }
        else if (!IsAdmin())
        {
          Orders = Orders.Where(x => x.TenantUserName == userName);
        }
      }
      else
      {
        Orders = Orders.Where(x => x.TenantUserName == query.TanentName);
      }

      logger.LogInformation("startDate=" + (query.StartDate.HasValue ? query.StartDate.Value.ToString() : ""));

      if (query.StartDate.HasValue)
      {
        Orders = Orders.Where(x => x.CreateDate >= query.StartDate.Value);
      }
      if (query.EndDate.HasValue)
      {
        Orders = Orders.Where(x => x.CreateDate <= query.EndDate.Value.AddDays(1));
      }

      if (!string.IsNullOrEmpty(query.OrderNo))
      {
        Orders = Orders.Where(x => x.OrderNo.Contains(query.OrderNo));
      }

      var data = Orders.OrderByDescending(x => x.CreateDate).Pagination(query);
      return Json(data);
    }

    [HttpGet("/api/Orders/checkBenifitCodeAvailiable/{code}")]
    public bool CheckBenifitCodeAvailiable(string code)
    {
      if (string.IsNullOrEmpty(code)) return false;
      var entity = ctx.BenefitCodes.FirstOrDefault(x => x.Code == code);
      if (entity == null) return false;
      return !entity.IsUsed;
    }

    public IActionResult Buy([FromBody] OrdersModelView model)
    {
      logger.LogInformation("code=" + model.Code);
      if (IsAgent())
      {
        return BadRequest("代理商账号不允许下单,请使用代理商租户账号下单.");
      }
      if (model.Count < 1)
      {
        return BadRequest("购买数量必须大于0");
      }

      var config = AppInstance.Instance.Config;
      var myOrders = new MyOrder();

      bool codeAvailiable = CheckBenifitCodeAvailiable(model.Code);
      var codeEntity = ctx.BenefitCodes.FirstOrDefault(x => x.Code == model.Code);

      if (!string.IsNullOrEmpty(model.Code))
      {
        if (!codeAvailiable)
        {
          return BadRequest("优惠码不存在或已被占用");
        }

        codeEntity.Consumer = User.Identity.Name;
        codeEntity.UsedDate = DateTime.Now;
        codeEntity.IsUsed = true;

        myOrders.BenifitCode = model.Code;
        myOrders.RecommandUserName = codeEntity.Creator;
      }

      string userName = User.Identity.Name;
      myOrders.OrderNo = StringHelper.GetOrdersNo();
      myOrders.CreateDate = DateTime.Now;
      myOrders.IsPaid = false;

      myOrders.TenantUserName = userName;
      myOrders.LicenseCount = model.Count;

      myOrders.Price = config.PricePerDay;
      var subTotal = model.Count * config.PricePerDay * model.Days;
      myOrders.Amount = subTotal;
      myOrders.SubTotal = subTotal;
      myOrders.ValidDays = model.Days;

      if (codeAvailiable)
      {
        myOrders.Amount = subTotal * ((100 - config.Discount) / 100);
        myOrders.Commission = config.CommissionRate * subTotal / 100;
        codeEntity.Commission = myOrders.Commission;
      }

      this.ctx.Orders.Add(myOrders);
      ctx.SaveChanges();
      return CreatedAtAction("MyOrders", new { id = myOrders.Id }, myOrders);
    }

    public IActionResult Checkout([FromBody] PayModel model)
    {
      var myOrders = ctx.Orders.FirstOrDefault(x => x.Id == model.Id);
      if (myOrders == null)
      {
        return BadRequest("订单号不存在");
      }
      if (myOrders.IsPaid)
      {
        return BadRequest("订单已付款");
      }
      if (model.PayMethod == (int)PayMethod.Free && !IsAdmin())
      {
        return BadRequest("只有管理员才可以做免单操作");
      }
      //管理员免单操作
      if (!IsAdmin())
      {
        if (myOrders.Amount == 0)
        {
          return BadRequest("订单金额不能为0");
        }
      }

      myOrders.PayMethod = (PayMethod)model.PayMethod;
      myOrders.IsPaid = true;
      myOrders.PayDateTime = DateTime.Now;
      ctx.SaveChanges();

      for (int i = 0; i < myOrders.LicenseCount; i++)
      {
        License license = new License();
        license.TenantUserName = myOrders.TenantUserName;
        license.LicenseType = LicenseType.Formal;
        license.Certification = StringHelper.GetRandom(128);
        license.GenerateDate = DateTime.Now;
        license.ValidDays = myOrders.ValidDays;
        license.Status = LicenseStatus.InActive;
        ctx.Licenses.Add(license);
      }

      //记账
      var account = ctx.UserAccounts.FirstOrDefault(x => x.UserName == AppConfig.PlatformId);
      if (account == null)
      {
        account = new UserAccount()
        {
          UserName = AppConfig.PlatformId,
          Balance = 0,
        };
        ctx.UserAccounts.Add(account);
      }
      decimal beforeBlance = account.Balance;
      //记录总账
      AccountDetail ad = new AccountDetail()
      {
        BeforeBalance = beforeBlance,
        FromUserName = myOrders.TenantUserName,
        AfterBalance = beforeBlance + myOrders.Amount,
        UserName = AppConfig.PlatformId,
        TransTime = DateTime.Now,
        TransType = TransType.Order,
        Amount = myOrders.Amount,
        OrderNo = myOrders.OrderNo,
        Remark = string.Format("用户{0}订单金额:{1}", myOrders.TenantUserName, myOrders.Amount)
      };
      if (myOrders.PayMethod == PayMethod.Free)
      {
        ad.Remark += ",后台免单";
      }
      ctx.AccountDetails.Add(ad);

      beforeBlance = ad.AfterBalance;
      //记录佣金
      if (myOrders.Commission > 0)
      {
        beforeBlance = ad.AfterBalance;
        ad = new AccountDetail()
        {
          BeforeBalance = beforeBlance,
          FromUserName = AppConfig.PlatformId,
          AfterBalance = beforeBlance - myOrders.Commission,
          UserName = myOrders.RecommandUserName,
          TransTime = DateTime.Now,
          Amount = myOrders.Commission,
          OrderNo = myOrders.OrderNo,
          TransType = TransType.Commissoion,
          Remark = string.Format("平台账户支付订单佣金:{0}，收款人:{1}", myOrders.Commission, myOrders.RecommandUserName)
        };
        ctx.AccountDetails.Add(ad);
      }

      account.Balance = ad.AfterBalance;
      //将实例切换成正式实例
      var instance = ctx.Instances.FirstOrDefault(x => x.TenantUserName == myOrders.TenantUserName);
      if (instance != null)
      {
        instance.IsTrial = false;
      }

      ctx.SaveChanges();

      //试用许可设置无效
      var trialLiceses = ctx.Licenses.AsQueryable().Where(x => x.TenantUserName == myOrders.TenantUserName && x.LicenseType == LicenseType.Trial).ToList();
      foreach (var trialLicese in trialLiceses)
      {
        trialLicese.ValidDays = 0;
      }
      // ctx.Licenses.RemoveRange(trialLiceses);
      ctx.SaveChanges();

      //同步内容服务器
      var url = string.Format("{0}/{1}", instance.ApiServer, AppInstance.Instance.Config.CreateInstanceUrl);
      var config = AppInstance.Instance.Config;
      //reference http://pawel.sawicz.eu/async-and-restsharp/
      using (HttpClient client = new HttpClient())
      {
        var parameters = new
        {
          Database = instance.DatabaseName,
          Resource = instance.Resource,
          Authkey = AppInstance.Instance.Config.Authkey,
          InstanceName = instance.InstanceName,
          TenantUserName = myOrders.TenantUserName,
          IsTrial = false
        };
        var content = new StringContent(JsonConvert.SerializeObject(parameters), System.Text.Encoding.UTF8, "application/json");
        var response = client.PostAsync(url, content).Result;
        if (response.IsSuccessStatusCode)
        {
          return new ContentResult() { Content = "操作成功" };
        }
        else
        {
          return BadRequest(response.Content.ReadAsStringAsync().Result);
        }
      }


    }
  }
}