using System;
using System.Linq;
using Ioliz.Service.Models;
using System.Data;
using Dapper;

namespace Ioliz.Service.Repositories
{
  public class OrderRepository : RepositoryBase
  {
    ServiceContext ctx;


    //drapper dependency
    public OrderRepository()
    {
    }

    //代理商获取租户信息
    public string[] GetMyTenants(string agentUser)
    {
      using (IDbConnection db = MemberConnection)
      {
        string sqlText = @"select UserName from AspNetUsers where agentUser=@agentUser";

        return db.Query<string>(sqlText, new
        {
          agentUser = agentUser
        }).ToArray();
      }
    }
    public OrderRepository(ServiceContext ctx)
    {
      this.ctx = ctx;
    }

    public void Checkout(string userName, string ServiceNo, PayMethod payMethod)
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
      var tenant = myService.UserName;
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
        license.UserName = myService.UserName;
        license.LicenseType = LicenseType.Formal;
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
        TransType = TransType.Order,
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
      var instance = ctx.Instances.FirstOrDefault(x => x.UserName == tenant);
      if (instance != null)
      {
        instance.IsTrial = false;
      }
      else
      {
        var resourceServer = AppInstance.Instance.Config.ResourceServers.First().Domain;
        instance = new Instance();
        instance.UserName = userName;
        instance.CreateDate = DateTime.Now;
        instance.FileServer = resourceServer;
        ctx.Instances.Add(instance);
      }

      ctx.SaveChanges();

      //试用证书换成正式证书
      var trialLiceses = ctx.Licenses.AsQueryable().Where(x => x.UserName == tenant && x.LicenseType == LicenseType.Trial).ToList();
      var notUsedFormalLiceses = ctx.Licenses.AsQueryable().Where(x => x.UserName == tenant && x.LicenseType == LicenseType.Formal && x.Status == LicenseStatus.InActive).ToList();

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
          if (string.IsNullOrEmpty(x.DeviceId)) return;
          var device = ctx.Devices.FirstOrDefault(m => m.DeviceId == x.DeviceId);
          n1.ActivationdDate = DateTime.Now;

          n1.DeviceId = x.DeviceId;
          n1.Status = LicenseStatus.Active;

          ctx.Licenses.Remove(x);
        }
      });
      ctx.SaveChanges();

    }
  }
}