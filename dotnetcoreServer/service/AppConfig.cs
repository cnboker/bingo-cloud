using System;
using System.Linq;
using System.Collections.Generic;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Senparc.Weixin.MP.TenPayLibV3;

namespace Ioliz.Service
{
    public class ResourceServerConfig {
        public string Name {get;set;}
        public string Description {get;set;}
        public string Domain {get;set;}
    }

    public class AppConfig
    {

        // 单价／设备／月
        public decimal PricePerDay { get; set; }

        public int TrialDays { get; set; }

        public int TrialMaxDeviceCount { get; set; }
 
        public decimal CommissionRate { get; set; }
        public decimal TrialMaxUploadVideoFileSize { get; set; }
        public int TrialMaxUsePictureCount { get; set; }

        public string AuthServer { get; set; }

        private TenPayV3Info _tenpayV3Info = null;
        public TenPayV3Info TenPayV3Info
        {
            get
            {
                return _tenpayV3Info;
            }
        }
        private IServiceProvider provider;

        public const string PlatformId = "dsliz";

        public string ServieServer { get; set; }
        public string WeixinToken { get; set; }
        public string WeixinEncodingAESKey { get; set; }
        public string WeixinAppId { get; set; }
        public string MQTTConnectionString;
        public string MemberConnectionString;
        public string ServiceConnectionString;
        public string MQTTServer;
        public string FileServer;

        public ResourceServerConfig[] ResourceServers {get;set;}
        public int MaxBenefitCountByDay { get;  set; }


        public AppConfig(IServiceProvider provider)
        {
            this.provider = provider;
            IConfigurationRoot configRoot = provider.GetService(typeof(IConfigurationRoot)) as IConfigurationRoot;
            LoadConfig(configRoot);
        }

        public AppConfig(IConfigurationRoot configRoot){
            LoadConfig(configRoot);
        }
        
        public void LoadConfig(IConfigurationRoot configRoot)
        {
            MQTTServer = configRoot.GetSection("AppSettings:mqttServer").Value;
            AuthServer = configRoot.GetSection("AppSettings:authServer").Value;
            ServieServer = configRoot.GetSection("AppSettings:servieServer").Value;
            FileServer = configRoot.GetSection("AppSettings:fileServer").Value;

            MemberConnectionString = Microsoft.Extensions.Configuration
         .ConfigurationExtensions.GetConnectionString(configRoot, "MemberConnection");

            ServiceConnectionString = Microsoft.Extensions.Configuration
            .ConfigurationExtensions.GetConnectionString(configRoot, "ServiceConnection");

            MQTTConnectionString = Microsoft.Extensions.Configuration
            .ConfigurationExtensions.GetConnectionString(configRoot, "MQTTConnection");

            if(this.provider != null){
                LoadKeyValues();
            }
        }

        public void RegisterWeixinPay()
        {
            IConfigurationRoot configRoot = provider.GetService(typeof(IConfigurationRoot)) as IConfigurationRoot;
            var TenPayV3_MchId = configRoot.GetSection("WeixinPay:TenPayV3_MchId").Value;
            var TenPayV3_Key = configRoot.GetSection("WeixinPay:TenPayV3_Key").Value;
            var TenPayV3_AppId = configRoot.GetSection("WeixinPay:TenPayV3_AppId").Value;
            var TenPayV3_AppSecret = configRoot.GetSection("WeixinPay:TenPayV3_AppSecret").Value;
            var TenPayV3_TenpayNotify = configRoot.GetSection("WeixinPay:TenPayV3_TenpayNotify").Value;
            WeixinToken = configRoot.GetSection("WeixinPay:WeixinToken").Value;
            WeixinEncodingAESKey = configRoot.GetSection("WeixinPay:WeixinEncodingAESKey").Value;
            WeixinAppId = configRoot.GetSection("WeixinPay:TenPayV3_AppId").Value;

            _tenpayV3Info = new TenPayV3Info(TenPayV3_AppId,
             TenPayV3_AppSecret,
             TenPayV3_MchId,
             TenPayV3_Key,
             TenPayV3_TenpayNotify
             );
            TenPayV3InfoCollection.Register(_tenpayV3Info);
        }

        private T GetValue<T>(IList<KeyValue> list, string key)
        {
            var val = list.FirstOrDefault(x => x.Key == key);
            Console.WriteLine(key + "," + (val==null));
            if (val == null) return default(T);
            return val.Value.Convert<T>();
        }

        public void LoadKeyValues()
        {
            var logger = provider.GetRequiredService<ILogger<AppConfig>>();
            var ctx = provider.GetRequiredService<ServiceContext>();
            var keyValues = ctx.KeyValues.ToList();
            PricePerDay = GetValue<decimal>(keyValues, KeyValueType.PricePerDay.ToString());
            logger.LogInformation("PricePerDay=" + PricePerDay + ",keyValues.len=" + keyValues.Count);
            TrialDays = GetValue<int>(keyValues, KeyValueType.TrialDays.ToString());
            TrialMaxDeviceCount = GetValue<int>(keyValues, KeyValueType.TrialMaxDeviceCount.ToString());

            CommissionRate = GetValue<decimal>(keyValues, KeyValueType.CommissionRate.ToString());
            TrialMaxUploadVideoFileSize = GetValue<decimal>(keyValues, KeyValueType.TrialMaxUploadVideoFileSize.ToString());
            TrialMaxUsePictureCount = GetValue<int>(keyValues, KeyValueType.TrialMaxUsePictureCount.ToString());
            MaxBenefitCountByDay = GetValue<int>(keyValues, KeyValueType.MaxBenefitCountByDay.ToString());
    
        }
    }
}