using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FileServer
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)

                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder
                    .UseKestrel(options =>
                    {
                        options.Limits.MaxRequestBodySize = 1024 * 1024 * 2000;
                    })
                    .UseUrls("http://*:5000")
                    //fix IHostingEnvironment.WebRootPath is null
                    .UseContentRoot(Directory.GetCurrentDirectory())
                    .UseWebRoot("wwwroot")
                    .UseStartup<Startup>();
                });
    }
}
