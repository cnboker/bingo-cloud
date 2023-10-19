using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Ioliz.Service.Models;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Senparc.Weixin.MP.TenPayLibV3;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Ioliz.Service
{
    public class Program
    {

        public static void Main(string[] args)
        {
            var host = CreateHostBuilder(args).Build();
          
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    DbInitializer.Initialize(services);
                    AppInstance.Initialize(services);
                    AppInstance.Instance.Config.RegisterWeixinPay();
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred while migrating the database.");
                }
            }

            host.Run();
        }


        public static IHostBuilder CreateHostBuilder(string[] args) =>
                 Host.CreateDefaultBuilder(args)
                     .ConfigureWebHostDefaults(webBuilder =>
                     {
                         webBuilder.UseUrls("http://*:6001")
                           .UseStartup<Startup>();
                     });

        //   public static IWebHost BuildWebHost(string[] args) =>
        //  WebHost.CreateDefaultBuilder(args)
        //  .ConfigureLogging(builder => builder.AddFile())
        //  .UseUrls("http://0.0.0.0:5001")
        //  .UseStartup<Startup>()
        //  .Build();

    }
}
