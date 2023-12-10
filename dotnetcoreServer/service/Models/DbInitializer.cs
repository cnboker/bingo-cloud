using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
namespace Ioliz.Service.Models
{
  public static class DbInitializer
  {

    public static void Initialize(IServiceProvider provider)
    {
      var context = provider.GetRequiredService<ServiceContext>();
      if (context.Database.GetPendingMigrations().Any())
      {
        context.Database.Migrate();
      }
      //context.Database.EnsureCreated();
      if (!context.AccountDetails.Any())
      {
        for (int i = 0; i < 50; i++)
        {
          var accountDetail = new AccountDetail()
          {
            BeforeBalance = i,
            UserName = "ironpower",
            FromUserName = "scott" + (i > 30 ? i.ToString() : ""),
            AfterBalance = i + 10,
            Amount = 10,
            OrderNo = Guid.NewGuid().ToString(),
            TransTime = DateTime.Now.AddDays(-i),
            TransType = TransType.Order
          };
          context.AccountDetails.Add(accountDetail);
        }

      }
      if (!context.KeyValues.Any())
      {
        context.KeyValues.AddRange(new KeyValue[]{
          
            new KeyValue(){
              //KeyValueType = (int)KeyValueType.PricePerDay,
              Key = KeyValueType.PricePerDay.ToString(),
              Value = "0.02"
            },
            new KeyValue(){
              //KeyValueType = (int)KeyValueType.TrialDays,
              Key = KeyValueType.TrialDays.ToString(),
              Value = "360"
            },
            new KeyValue(){
              //KeyValueType = (int)KeyValueType.TrialMaxDeviceCount,
              Key = KeyValueType.TrialMaxDeviceCount.ToString(),
              Value = "3"
            },
         
            new KeyValue(){
                //KeyValueType = (int)KeyValueType.CommissionRate,
                Key = KeyValueType.CommissionRate.ToString(),
                Value = "20"
            },
            new KeyValue(){
              //KeyValueType = (int)KeyValueType.TrialMaxUsePictureCount,
              Key = KeyValueType.TrialMaxUsePictureCount.ToString(),
              Value="30"
            },
            new KeyValue(){
              //KeyValueType = (int)KeyValueType.TrialMaxUploadVideoFileSize,
              Key = KeyValueType.TrialMaxUploadVideoFileSize.ToString(),
              Value = "10"
            }          
          });

      }

      context.SaveChanges();
    }
  }
}