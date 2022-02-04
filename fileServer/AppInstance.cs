using System;
using Microsoft.Extensions.Configuration;

namespace FileServer{

  public class AppInstance{
    static AppInstance appContext;
    private AppConfig config;

    AppInstance(){}
     
    public  AppConfig Config{
      get{
        if(config == null)throw new Exception("Please Call Initaialize First!");
        return config;
      } 
    }

    public static AppInstance Instance{
      get{
        return appContext;
      }
    }

    public static void Initialize( IServiceProvider provider){
        appContext = new AppInstance(){
              config = new AppConfig(provider) 
        };
       
    }

    public static void Initialize(IConfigurationRoot configRoot){
        appContext = new AppInstance(){
              config = new AppConfig(configRoot) 
        };
       
    }
  }
}