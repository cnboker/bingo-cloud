using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using Member.Repositories;
using Ioliz.Service.Models;
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
    public class ServiceController : BaseController
    {
        private readonly IConfiguration configuration;
        public ServiceController(ServiceContext ctx, ILogger<BaseController> logger, IConfiguration configuration) : base(ctx, logger)
        {
            this.configuration = configuration;
        }

        public IActionResult MyService(int id)
        {
            var userName = User.Identity.Name;
            var entity = ctx.Orders.FirstOrDefault(x => x.Id == id);
            if (entity == null) return BadRequest();
            return Json(entity);
        }

        [HttpPost("/api/Service/cancel/{id}")]
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
        [HttpPost("/api/Service/free/{id}")]
        public IActionResult Free(int id)
        {
            var userName = User.Identity.Name;
            var entity = ctx.Orders.FirstOrDefault(x => x.Id == id);
            if (entity == null) return BadRequest("Service not exist");
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

        [HttpPost]
        public IActionResult MyServices([FromBody] OrderQuery query)
        {
            var userName = User.Identity.Name;
            var Services = ctx.Orders.AsQueryable();
            if (string.IsNullOrEmpty(query.TanentName))
            {
                if (IsAgent())
                {
                    // var configuration = this.HttpContext.RequestServices.GetService(typeof(IConfiguration)) as IConfiguration;
                    logger.LogInformation("configuration is not null," + (this.configuration != null));
                    ServiceRepository ServiceRep = new ServiceRepository(this.configuration);
                    var myTenants = ServiceRep.GetMyTenants(userName);
                    Services = Services.Where(x => myTenants.Contains(x.TenantUserName) || x.TenantUserName == userName);
                }
                else if (!IsAdmin())
                {
                    Services = Services.Where(x => x.TenantUserName == userName);
                }
            }
            else
            {
                Services = Services.Where(x => x.TenantUserName == query.TanentName);
            }

            logger.LogInformation("startDate=" + (query.StartDate.HasValue ? query.StartDate.Value.ToString() : ""));

            if (query.StartDate.HasValue)
            {
                Services = Services.Where(x => x.CreateDate >= query.StartDate.Value);
            }
            if (query.EndDate.HasValue)
            {
                Services = Services.Where(x => x.CreateDate <= query.EndDate.Value.AddDays(1));
            }

            if (!string.IsNullOrEmpty(query.OrderNo))
            {
                Services = Services.Where(x => x.OrderNo.Contains(query.OrderNo));
            }

            var data = Services.OrderByDescending(x => x.CreateDate).Pagination(query);
            return Json(data);
        }

        [HttpGet("/api/Service/checkBenifitCodeAvailiable/{code}")]
        public bool CheckBenifitCodeAvailiable(string code)
        {
            if (string.IsNullOrEmpty(code)) return false;
            var entity = ctx.BenefitCodes.FirstOrDefault(x => x.Code == code);
            if (entity == null) return false;
            return !entity.IsUsed;
        }

        public IActionResult Buy([FromBody]ServiceModelView model)
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
            var myService = new MyOrder();

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

                myService.BenifitCode = model.Code;
                myService.RecommandUserName = codeEntity.Creator;
            }

            string userName = User.Identity.Name;
            myService.OrderNo = StringHelper.GetServiceNo();
            myService.CreateDate = DateTime.Now;
            myService.IsPaid = false;

            myService.TenantUserName = userName;
            myService.LicenseCount = model.Count;

            myService.Price = config.PricePerDay;
            var subTotal = model.Count * config.PricePerDay * model.Days;
            myService.Amount = subTotal;
            myService.SubTotal = subTotal;
            myService.ValidDays = model.Days;

            if (codeAvailiable)
            {
                myService.Amount = subTotal * ((100 - config.Discount) / 100);
                myService.Commission = config.CommissionRate * subTotal / 100;
                codeEntity.Commission = myService.Commission;
            }

            this.ctx.Orders.Add(myService);
            ctx.SaveChanges();
            return CreatedAtAction("MyService", new { id = myService.Id }, myService);
        }

        public IActionResult Checkout([FromBody]PayModel model)
        {
            var myService = ctx.Orders.FirstOrDefault(x => x.Id == model.Id);
            if (myService == null)
            {
                return BadRequest("订单号不存在");
            }
            if (myService.IsPaid)
            {
                return BadRequest("订单已付款");
            }
            if(model.PayMethod == (int)PayMethod.Free && !IsAdmin()){
                 return BadRequest("只有管理员才可以做免单操作");
            }
            //管理员免单操作
            if (!IsAdmin())
            {
                if (myService.Amount == 0)
                {
                    return BadRequest("订单金额不能为0");
                }
            }

            myService.PayMethod = (PayMethod)model.PayMethod;
            myService.IsPaid = true;
            myService.PayDateTime = DateTime.Now;
            ctx.SaveChanges();

            for (int i = 0; i < myService.LicenseCount; i++)
            {
                License license = new License();
                license.TenantUserName = myService.TenantUserName;
                license.LicenseType = LicenseType.Formal;
                license.Certification = StringHelper.GetRandom(128);
                license.GenerateDate = DateTime.Now;
                license.ValidDays = myService.ValidDays;
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
                FromUserName = myService.TenantUserName,
                AfterBalance = beforeBlance + myService.Amount,
                UserName = AppConfig.PlatformId,
                TransTime = DateTime.Now,
                TransType = TransType.Service,
                Amount = myService.Amount,
                OrderNo = myService.OrderNo,
                Remark = string.Format("用户{0}订单金额:{1}", myService.TenantUserName, myService.Amount)
            };
            if (myService.PayMethod == PayMethod.Free)
            {
                ad.Remark += ",后台免单";
            }
            ctx.AccountDetails.Add(ad);

            beforeBlance = ad.AfterBalance;
            //记录佣金
            if (myService.Commission > 0)
            {
                beforeBlance = ad.AfterBalance;
                ad = new AccountDetail()
                {
                    BeforeBalance = beforeBlance,
                    FromUserName = AppConfig.PlatformId,
                    AfterBalance = beforeBlance - myService.Commission,
                    UserName = myService.RecommandUserName,
                    TransTime = DateTime.Now,
                    Amount = myService.Commission,
                    OrderNo = myService.OrderNo,
                    TransType = TransType.Commissoion,
                    Remark = string.Format("平台账户支付订单佣金:{0}，收款人:{1}", myService.Commission, myService.RecommandUserName)
                };
                ctx.AccountDetails.Add(ad);
            }

            account.Balance = ad.AfterBalance;
            //将实例切换成正式实例
            var instance = ctx.Instances.FirstOrDefault(x => x.TenantUserName == myService.TenantUserName);
            if (instance != null)
            {
                instance.IsTrial = false;
            }

            ctx.SaveChanges();

            //试用许可设置无效
            var trialLiceses = ctx.Licenses.AsQueryable().Where(x => x.TenantUserName == myService.TenantUserName && x.LicenseType == LicenseType.Trial).ToList();
            foreach(var trialLicese in trialLiceses){
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
                    TenantUserName = myService.TenantUserName,
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