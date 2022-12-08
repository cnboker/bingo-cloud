using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Ioliz.Service.Models;
using System.Globalization;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json.Serialization;

namespace Ioliz.Service
{
    public partial class Startup
    {
        //IWebHostEnvironment env;
        public Startup(IWebHostEnvironment env)
        {
            //this.env = env;
            var builder = new ConfigurationBuilder()
                .SetBasePath(env.ContentRootPath)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
                .AddEnvironmentVariables();
            Configuration = builder.Build();
        }

        public IConfigurationRoot Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddRazorPages();
            // add CORS services
            services.AddCors(
              o => o.AddPolicy("policy", b =>
              {
                  b.AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
              }));
            //api json return lowercase object
            services.AddControllers().AddNewtonsoftJson(options =>
            {
                options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
            }); ;
            services.AddMvcCore().AddNewtonsoftJson();
            //fix "Self referencing loop detected for property Newtonsoft.Json.JsonSerializationException"
            services.AddDbContext<ServiceContext>(
                    options =>
                    {
                        var connetionString = Configuration.GetConnectionString("ServiceConnection");
                        options.UseMySql(connetionString, ServerVersion.AutoDetect(connetionString),
                          mySqlOptionsAction:options=>{
                            //mysql docker启动比较慢， 为了连接正常工作，增加连接失败重新连接策略
                            options.EnableRetryOnFailure(
                                maxRetryCount: 10,
                                maxRetryDelay:TimeSpan
                                .FromSeconds(10),
                                errorNumbersToAdd:null
                            );
                         }
                        );
                    });

            services.AddMemoryCache();
            services.AddLocalization();
            services.AddSingleton<IConfigurationRoot>(Configuration);
            ConfigureAuthService(services);
            // Add framework services.
            // services.AddMvc()
            // .SetCompatibilityVersion(CompatibilityVersion.Version_2_1)
            //.AddViewLocalization(LanguageViewLocationExpanderFormat.Suffix);

            services.AddPortableObjectLocalization();

            services.Configure<RequestLocalizationOptions>(options =>
                {
                    var supportedCultures = new List<CultureInfo>
                    {
                new CultureInfo("en-US"),
                new CultureInfo("en"),
                new CultureInfo("zh-CN"),
                new CultureInfo("zh")
                    };

                    options.DefaultRequestCulture = new RequestCulture("zh-CN");
                    options.SupportedCultures = supportedCultures;
                    options.SupportedUICultures = supportedCultures;
                });

        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseCors("policy");
            app.UseStaticFiles();
            // app.UseStaticFiles(new StaticFileOptions
            // {
            //     FileProvider = new PhysicalFileProvider(
            // Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
            //     RequestPath = "/"
            // });
            //     app.UseStaticFiles(new StaticFileOptions
            //     {
            //         FileProvider = new PhysicalFileProvider(
            //    Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/ota")),
            //         RequestPath = "/ota"
            //     });


            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/error");
            }

            //app.UseHttpsRedirection();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseRequestLocalization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapRazorPages();
                endpoints.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");
            });
            // app.UseMvc(routes =>
            //     {
            //         routes.MapRoute(
            // name: "default",
            // template: "{controller=Home}/{action=Index}/{id?}");
            //     });
            //AppInstance.Initialize(Configuration,app.ApplicationServices);
            //DbInitializer.Initialize(app.ApplicationServices);
        }
    }
}
