using System;
using Member.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Member.CustomTokenProvider;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Hosting;
using Ioliz.Shared.Middlewares;

namespace Ioliz
{
    public partial class Startup
    {
        public IConfigurationRoot Configuration { get; set; }
        private IWebHostEnvironment env;

        public Startup(IWebHostEnvironment env)
        {
            this.env = env;
            var builder = new ConfigurationBuilder()
                .SetBasePath(env.ContentRootPath)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
                .AddEnvironmentVariables();
            Configuration = builder.Build();
        }
        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
           
            // add CORS services
            services.AddCors(
              o => o.AddPolicy("policy", b =>
              {
                  b.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
              }));
            services.AddControllers();



            //product
            services.AddDbContext<IolizContext>(
                     options => {
                         var connetionString = Configuration.GetConnectionString("MemberConnection");
                         options.UseMySql(connetionString, ServerVersion.AutoDetect(connetionString),
                         mySqlOptionsAction:options=>{
                            //mysql docker启动比较慢， 为了连接正常工作，增加连接失败重新连接策略
                            options.EnableRetryOnFailure(
                                maxRetryCount: 10,
                                maxRetryDelay:TimeSpan
                                .FromSeconds(30),
                                errorNumbersToAdd:null
                            );
                         }
                         );});

           
            services.AddIdentity<ApplicationUser, IdentityRole>(config =>
              {
                  config.SignIn.RequireConfirmedEmail = true;
              })

                   .AddEntityFrameworkStores<IolizContext>()
                   .AddDefaultTokenProviders();
            services.AddSingleton<IConfigurationRoot>(Configuration);
            ConfigureAuthService(services);
            services.AddScoped<Microsoft.AspNetCore.Identity.IUserClaimsPrincipalFactory<ApplicationUser>, AppClaimsPrincipalFactory>();

            //services.AddMvc();
            services.AddRazorPages();
            //增加授权策略解决匿名用户报告“The AuthorizationPolicy named: 'Administrators' was not found.”问题
            // services.AddAuthentication(options =>
            // {
            //     options.AddPolicy("Administrators",
            //     authBuilder =>
            //     {
            //         authBuilder.RequireRole("Administrators");
            //     });
            // });

            services.AddScoped<IIDentityTransaction, IdentityTransaction>();
            services.Configure<IdentityOptions>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 6;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                //lockout settings
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(120);
                options.Lockout.MaxFailedAccessAttempts = 6;


                //user settings
                options.User.RequireUniqueEmail = true;
                //add application services
                //services.AddTransient<IEmailSender, AuthMessageSender>();
                //services.AddTransient<ISmsSender, AuthMessageSender>();
            });

            services.ConfigureApplicationCookie(options =>
            {
                options.LoginPath = "/account/login";
                options.LogoutPath = "/account/logout";
                options.ExpireTimeSpan = TimeSpan.FromDays(360);

            });


        }



        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app,
        IWebHostEnvironment env,

        IolizContext dbContext)
        {

            app.UseCors("policy");
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                //app.UseDatabaseErrorPage();
                //app.UseBrowserLink();
                //It is possible to generate the database programmatically (but you always need to create the migration first). 
                //This way if you want to share your project with someone else, they won’t have to run dotnet ef database update before being able to run the project.
                //dbContext.Database.Migrate(); //this will generate the db if it does not exist

            }
            //app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseRouting();
            //app.UseIdentity();
            ConfigureAuth(app);
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

            app.UseMiddleware(typeof(ErrorHandingMiddleware));
           
        }
    }
}
