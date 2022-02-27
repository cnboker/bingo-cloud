using ImageThumbnail.AspNetCore.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;


namespace FileServer
{
    public partial class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(
             o => o.AddPolicy("policy", b =>
             {
                 b.AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
             }));
            services.AddControllers();
            services.Configure<FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 1024 * 1024 * 2000;
                options.MultipartHeadersCountLimit = 10;
            });
            //   services.AddControllers().AddNewtonsoftJson(options =>
            //   {
            //     options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
            //   }); ;
            //   services.AddMvcCore().AddNewtonsoftJson();
            ConfigureAuthService(services);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            ImageThumbnailOptions options = new ImageThumbnailOptions("wwwroot", "Thumbnails");
            options.ImageQuality = 75L;
            app.UseImageThumbnail(options);
            app.UseVideoThumbnail(options);

            AppInstance.Initialize(app.ApplicationServices);
            app.UseCors("policy");
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            //app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();


            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
