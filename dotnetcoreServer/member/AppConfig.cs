using System;
using Microsoft.Extensions.Configuration;


namespace Ioliz
{

  public class AppConfig
  {

    //private IServiceProvider provider;
    public string AppHost { get; set; }
    public string Secret {get;set;}
//10 years
    public const int TokenExpired = 365*10;
    public AppConfig(IServiceProvider provider)
    {
      IConfigurationRoot configRoot = provider.GetService(typeof(IConfigurationRoot)) as IConfigurationRoot;

      AppHost = configRoot.GetSection("AppSettings:appHost").Value;
      Secret = configRoot.GetSection("TokenAuthentication:SecretKey").Value;
     // TokenExpired = configRoot.GetSection("TokenAuthentication:timeout").Value.Convert<int>();
    }

  }
}