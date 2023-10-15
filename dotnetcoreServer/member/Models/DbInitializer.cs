using System;
using System.Linq;
using System.Threading.Tasks;
using Ioliz.Shared.Utils;
using Member.CustomTokenProvider;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace Member.Models
{
  public static class DbInitializer
  {
    //return task and in progam add wait
    async public static Task Initialize(IServiceProvider provider)
    {
      var context = provider.GetRequiredService<IolizContext>();
      var userManager = provider.GetRequiredService<UserManager<CustomTokenProvider.ApplicationUser>>();
      var roleManager = provider.GetRequiredService<RoleManager<IdentityRole>>();

      //context.Database.EnsureCreated();
      if (context.Database.GetPendingMigrations().Any())
        {
          context.Database.Migrate();
        }
      if (context.TenantAccounts.Any())
      {

      }
      bool userExisted = context.Users.Any();
      if (!userExisted)
      {

        var taskRole =  roleManager.FindByNameAsync("Administrators");
        if (taskRole.Result == null)
        {
          var role = new IdentityRole("Administrators");
          await roleManager.CreateAsync(role);
        }

        var roleName = "TenantAdministrators";
        taskRole =  roleManager.FindByNameAsync(roleName);
        if (taskRole.Result == null)
        {
          await roleManager.CreateAsync(new IdentityRole(roleName));
        }

        roleName = "TenantOperators";
        taskRole =  roleManager.FindByNameAsync(roleName);
        if (taskRole.Result == null)
        {
          await roleManager.CreateAsync(new IdentityRole(roleName));
        }

        roleName = "TenantAuditors";
        taskRole =  roleManager.FindByNameAsync(roleName);
        if (taskRole.Result == null)
        {
          await roleManager.CreateAsync(new IdentityRole(roleName));
        }
        
        await AddUser(provider, "admin", "111111", "Administrators");
      }

      if (!context.Servers.Any())
      {
        await context.Servers.AddRangeAsync(new Server[]{
            new Server(){ServerName="华南", Domain ="http://ds1.ioliz.com",
            APIDomain="http://dsapi1.ioliz.com",
             IP=StringHelper.ToIntIP("127.0.0.1"), Actived=true, CreateDate=DateTime.Now},
            new Server(){ServerName="华北",Domain = "http://ds2.ioliz.com",APIDomain="http://dsapi2.ioliz.com", IP=StringHelper.ToIntIP("127.0.0.1"), Actived = true, CreateDate=DateTime.Now},
            new Server(){ServerName="华西", Domain = "http://ds3.ioliz.com", APIDomain="http://dsapi3.ioliz.com",IP=StringHelper.ToIntIP("127.0.0.1"), Actived = true,CreateDate=DateTime.Now}
        });
        await context.SaveChangesAsync();
      }

    }

    private async static Task AddUser(IServiceProvider provider, string userName, string password, string roleName)
    {

      var manager = provider.GetRequiredService<UserManager<ApplicationUser>>();

      var userTask =  manager.FindByNameAsync(userName);
      if (userTask.Result == null)
      {
        var newUser = new ApplicationUser(userName);
        newUser.Email = userName + "@qq.com";

        await manager.CreateAsync(newUser, password);
        await manager.SetLockoutEnabledAsync(newUser, true);
        if (!string.IsNullOrEmpty(roleName))
        {
          await manager.AddToRoleAsync(newUser, roleName);
        }
      }
    }

  }
}