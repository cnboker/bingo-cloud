using System;
using System.Linq;
using Ioliz.Service.Models;
using Ioliz.Service.Repositories;
using Ioliz.Shared.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

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
      OrderRepository orderRep = new OrderRepository();
      orderRep.Checkout(userName, entity.OrderNo, PayMethod.Free);
      return Ok();
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
          OrderRepository OrdersRep = new OrderRepository();
          var myTenants = OrdersRep.GetMyTenants(userName);
          Orders = Orders.Where(x => myTenants.Contains(x.UserName) || x.UserName == userName);
        }
        else if (!IsAdmin())
        {
          Orders = Orders.Where(x => x.UserName == userName);
        }
      }
      else
      {
        Orders = Orders.Where(x => x.UserName == query.TanentName);
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

    [HttpGet("/api/order/codeCheck/{code}")]
    public bool CodeCheck(string code)
    {
      if (string.IsNullOrEmpty(code)) return false;
      var entity = ctx.BenefitCodes.FirstOrDefault(x => x.Code == code);
      if (entity == null) return false;
      return !entity.IsUsed;
    }

    [HttpPost("/api/order/create")]
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

      bool codeAvailiable = CodeCheck(model.Code);
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

      myOrders.UserName = userName;
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
      return Ok(myOrders);
    }

  }
}