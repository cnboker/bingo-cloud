using System;
using System.Linq;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Ioliz.Service;
using System.Net.Http;
using Newtonsoft.Json;
using Ioliz.Service.Repositories;
using Microsoft.Extensions.Configuration;
using System.Data;
using Dapper;
using System.Collections.Generic;

namespace Member.Repositories
{
    public class ServiceRepository : RepositoryBase
    {
        ServiceContext ctx;


        //drapper dependency
        public ServiceRepository(IConfiguration configuration)
        {
        }

        //代理商获取租户信息
        public string[] GetMyTenants(string agentUser)
        {
            using (IDbConnection db = IdentityConnection)
            {
                string sqlText = @"select UserName from AspNetUsers where agentUser=@agentUser";

                return db.Query<string>(sqlText, new
                {
                    agentUser = agentUser
                }).ToArray();
            }
        }
        public ServiceRepository(ServiceContext ctx)
        {
            this.ctx = ctx;
        }

        public void Checkout(string ServiceNo, PayMethod payMethod)
        {
            var myService = ctx.Orders.FirstOrDefault(x => x.OrderNo == ServiceNo);

            if (myService == null)
            {
                throw new ApplicationException("订单号不存在");
            }
            if (myService.IsPaid)
            {
                throw new ApplicationException("订单已付款");
            }
            var tenant = myService.TenantUserName;
            //免单操作
            // if (this.identity.Name == "admin")
            // {
            //     if (myService.Amount == 0)
            //     {
            //         throw new ApplicationException("订单金额不能为0");
            //     }
            // }

            myService.PayMethod = payMethod;
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
            var account = ctx.UserAccounts.AsQueryable().FirstOrDefault(x => x.UserName == AppConfig.PlatformId);
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
                FromUserName = tenant,
                AfterBalance = beforeBlance + myService.Amount,
                UserName = AppConfig.PlatformId,
                TransTime = DateTime.Now,
                TransType = TransType.Service,
                Amount = myService.Amount,
                OrderNo = myService.OrderNo,
                Remark = string.Format("用户{0}订单金额:{1}", tenant, myService.Amount)
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
            var instance = ctx.Instances.FirstOrDefault(x => x.TenantUserName == tenant);
            if (instance != null)
            {
                instance.IsTrial = false;
            }

            ctx.SaveChanges();

            //试用证书换成正式证书
            var trialLiceses = ctx.Licenses.AsQueryable().Where(x => x.TenantUserName == tenant && x.LicenseType == LicenseType.Trial).ToList();
            var notUsedFormalLiceses = ctx.Licenses.AsQueryable().Where(x => x.TenantUserName == tenant && x.LicenseType == LicenseType.Formal && x.Status == LicenseStatus.InActive).ToList();
           
            trialLiceses.ForEach(x =>
            {
                if (x.Status == LicenseStatus.InActive)
                {
                    ctx.Licenses.Remove(x);
                    return;
                }
               
                var n1 = notUsedFormalLiceses.FirstOrDefault(c => c.Status == LicenseStatus.InActive);

                if (n1 != null)
                {
                    if(string.IsNullOrEmpty(x.DeviceId))return;
                    var device = ctx.Devices.FirstOrDefault(m => m.DeviceId == x.DeviceId);
                    n1.ActivationdDate = DateTime.Now;
                    n1.ApiUrl = x.ApiUrl;
                    n1.DeviceId = x.DeviceId;
                    n1.Status = LicenseStatus.Active;
                    device.CurrentLicenseId = n1.Id;
                    ctx.Licenses.Remove(x);
                }
            });        
            ctx.SaveChanges();

            //同步内容服务器
            //var url = string.Format("{0}/{1}", instance.ApiServer, AppInstance.Instance.Config.CreateInstanceUrl);
            var url = string.Format("{0}/api/instance", instance.ApiServer);
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
                    TenantUserName = tenant,
                    IsTrial = false
                };
                var content = new StringContent(JsonConvert.SerializeObject(parameters), System.Text.Encoding.UTF8, "application/json");
                var response = client.PostAsync(url, content).Result;
                if (!response.IsSuccessStatusCode)
                {
                    throw new ApplicationException(response.Content.ReadAsStringAsync().Result);
                }
            }

        }


    }
}