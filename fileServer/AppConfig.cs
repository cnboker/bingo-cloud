using System;
using Microsoft.Extensions.Configuration;

namespace FileServer
{
  public class AppConfig
  {

    //验证服务器地址
    public string AuthServer { get; set; }


    private IServiceProvider provider;

    public const string PlatformId = "Ioliz";

    public string Domain { get; set; }

    public AppConfig(IServiceProvider provider)
    {
      this.provider = provider;
      IConfiguration configRoot = provider.GetService(typeof(IConfiguration)) as IConfiguration;
      LoadConfig(configRoot);
    }

    public AppConfig(IConfiguration configRoot)
    {
      LoadConfig(configRoot);
    }

    public void LoadConfig(IConfiguration configRoot)
    {
      AuthServer = configRoot.GetSection("AppSettings:authServer").Value;
      Domain = configRoot.GetSection("AppSettings:domain").Value;
    }
  }
}