using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Member.Models;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Ioliz
{
  public class Program
  {
    public static void Main(string[] args)
    {
      //var configuration = new ConfigurationBuilder()
      //.AddCommandLine(args)
      /*    var host = new WebHostBuilder()
             .UseKestrel()
             .UseContentRoot(Directory.GetCurrentDirectory())
             .UseIISIntegration()
             .UseStartup<Startup>()
             .Build(); 
         host.Run(); */
      var host = BuildWebHost(args);
      using (var scope = host.Services.CreateScope())
      {
        var services = scope.ServiceProvider;
        try
        {
          AppInstance.Initialize(services);
          DbInitializer.Initialize(services).Wait();
        }
        catch (Exception ex)
        {
          var logger = services.GetRequiredService<ILogger<Program>>();
          logger.LogError(ex, "");
        }
      }
      host.Run();
    }

    public static IWebHost BuildWebHost(string[] args) =>
    WebHost.CreateDefaultBuilder(args)
    .ConfigureLogging(builder => builder.AddFile())
    .UseUrls("http://0.0.0.0:7800")
    .UseIISIntegration()
    .UseStartup<Startup>()
    .Build();
  }

}
