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
using Microsoft.EntityFrameworkCore;

namespace Ioliz
{
  public class Program
  {

    public static void Main(string[] args)
    {
      var host = BuildWebHost(args);
      //migration database
      using (var scope = host.Services.CreateScope())
      {
        var services = scope.ServiceProvider;

        var context = services.GetRequiredService<IolizContext>();
        if (context.Database.GetPendingMigrations().Any())
        {
          context.Database.Migrate();
        }
      }

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
    .UseUrls("http://*:7800")
    .UseIISIntegration()
    .UseStartup<Startup>()
    .Build();
  }

}
