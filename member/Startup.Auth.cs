using System;
using System.Text;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using Member.CustomTokenProvider;
using Microsoft.AspNetCore.Http;
//You have to bring in Microsoft.Extensions.DependencyInjection namespace to gain access to the generic GetService()
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Ioliz
{
  public partial class Startup
  {
  
    private void ConfigureAuthService(IServiceCollection services)
    {
      var signingKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(Configuration.GetSection("TokenAuthentication:SecretKey").Value));

      //decode token url:https://jwt.io
      var tokenValidationParameters = new TokenValidationParameters
      {
        // The signing key must match!
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = signingKey,
        // Validate the JWT Issuer (iss) claim
        ValidateIssuer = true,
        ValidIssuer = Configuration.GetSection("TokenAuthentication:Issuer").Value,
        // Validate the JWT Audience (aud) claim
        ValidateAudience = true,
        ValidAudience = Configuration.GetSection("TokenAuthentication:Audience").Value,
        // Validate the token expiry
        ValidateLifetime = true,
        // If you want to allow a certain amount of clock drift, set that here:
        ClockSkew = TimeSpan.Zero
      };

      services.AddAuthentication(options =>
      {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
      })
      .AddJwtBearer(o =>
      {
        o.TokenValidationParameters = tokenValidationParameters;
      });

    }

    private void ConfigureAuth(IApplicationBuilder app)
    {
      var signingKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(Configuration.GetSection("TokenAuthentication:SecretKey").Value));

      var tokenProviderOptions = new TokenProviderOptions
      {
        Path = Configuration.GetSection("TokenAuthentication:TokenPath").Value,
        Audience = Configuration.GetSection("TokenAuthentication:Audience").Value,
        Issuer = Configuration.GetSection("TokenAuthentication:Issuer").Value,
        SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256),
        IdentityResolver = GetIdentity,
        CustomerIdentityResolver = GetCustomerIdentity
      };

      app.UseMiddleware<TokenProviderMiddleware>(Options.Create(tokenProviderOptions));

    }

    private async Task<ClaimsIdentity> GetCustomerIdentity(HttpContext context, string username, string token)
    {
        IIDentityTransaction it = context.RequestServices.GetService<IIDentityTransaction>();
        var success = await it.CustomerValidate(username, token);
         if (success)
        {
          var claims = await it.GetRoleClaim(username);
          return await Task.FromResult(new ClaimsIdentity(new GenericIdentity(username, "Token"), claims));
        }

      // Account doesn't exists
      return await Task.FromResult<ClaimsIdentity>(null);
    }

    private async Task<ClaimsIdentity> GetIdentity(HttpContext context, string username, string password)
    {
      IIDentityTransaction it = context.RequestServices.GetService<IIDentityTransaction>();
      var success = await it.CheckPassword(username, password);

      if (success)
      {
        var claims = await it.GetRoleClaim(username);
        return await Task.FromResult(new ClaimsIdentity(new GenericIdentity(username, "Token"), claims));
      }

      // Account doesn't exists
      return await Task.FromResult<ClaimsIdentity>(null);
    }

  }
}