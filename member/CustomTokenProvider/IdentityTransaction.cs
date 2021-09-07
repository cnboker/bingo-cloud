using System;
using System.Threading.Tasks;
using Member.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using System.Linq;
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using System.Web;
using Microsoft.Extensions.Logging;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Principal;
using Ioliz;

namespace Member.CustomTokenProvider
{
    public class IdentityTransaction : IIDentityTransaction
    {
        private readonly IolizContext _dbContext;

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private ILogger<IdentityTransaction> logger;
        public IdentityTransaction(
        IolizContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<IdentityTransaction> logger
        )
        {
            _dbContext = context;
            _userManager = userManager;
            _roleManager = roleManager;
            this.logger = logger;
        }
        public async Task<bool> CheckPassword(string userName, string password)
        {
            var user = await _userManager.FindByNameAsync(userName);
            if (user == null) return false;
            return await _userManager.CheckPasswordAsync(user, password);
        }

        public async Task<IList<string>> GetRoles(string userName)
        {
            var user = await _userManager.FindByNameAsync(userName);
            if (user == null) return new string[] { };
            return await _userManager.GetRolesAsync(user);
        }

        public async Task<IList<Claim>> GetRoleClaim(string userName)
        {
            var roleList = GetRoles(userName);
            List<Claim> claims = new List<Claim>();
            foreach (var userrole in roleList.Result)
            {
                claims.Add(new Claim(ClaimTypes.Role, userrole));
                var role = await _roleManager.FindByNameAsync(userrole);
                if (role != null)
                {
                    var roleClaims = await _roleManager.GetClaimsAsync(role);
                    foreach (Claim roleClaim in roleClaims)
                    {
                        claims.Add(roleClaim);
                    }
                }
            }
            var user = await _userManager.FindByNameAsync(userName);
            if (!string.IsNullOrEmpty(user.AgentUser))
            {
                claims.Add(new Claim("agentUser", user.AgentUser));
            }
            claims.Add(new Claim("userName", userName));
            claims.Add(new Claim("isAgent", user.IsAgent ? "true" : "false"));
            if (!string.IsNullOrEmpty(user.Setting))
            {
                claims.Add(new Claim("userSetting", user.Setting));
            }
            claims.Add(new Claim("email", user.Email));
            return claims;
        }

        // public async Task<string> RequestSession(string token, string returnUrl)
        // {
        //   //如果returnUrl不是服务器认证的服务器，则不处理
        //   //获取returnUrl中的sessionId
        //   string sessionId = "";
        //   if (returnUrl.ToLower().IndexOf("http://") >= 0)
        //   {
        //     var uris = await _dbContext.Servers.Where(x => x.Actived).Select(x => x.Domain).ToListAsync();
        //     var hosts = uris.Select(x => new Uri(x)).Select(x => x.Host.ToLower());
        //     var returnUrlHost = (new Uri(returnUrl)).Host.ToLower();
        //     if (!hosts.Contains(returnUrlHost))
        //     {
        //       return "";
        //     }
        //   }
        //   else
        //   {
        //     var uri = new Uri("http://localhost" + returnUrl);
        //     sessionId = HttpUtility.ParseQueryString(uri.Query).Get("sessionId");
        //   }

        //   // var sessionId = Guid.NewGuid().ToString("N");
        //   await _dbContext.ApiAuthSessions.AddAsync(new ApiAuthSession
        //   {
        //     SessionId = sessionId,
        //     Token = token,
        //     CreateDate = DateTime.Now,
        //     IsValid = true
        //   });
        //   await _dbContext.SaveChangesAsync();
        //   return sessionId;
        // }

        public void AuthenticateSessionHandle(string token, string returnUrl)
        {
            //string sessionId = "";
            // if (returnUrl.ToLower().IndexOf("http://") >= 0)
            // {
            //   var uris =  _dbContext.Servers.Where(x => x.Actived).Select(x => x.Domain).ToList();
            //   var hosts = uris.Select(x => new Uri(x)).Select(x => x.Host.ToLower());
            //   var returnUrlHost = (new Uri(returnUrl)).Host.ToLower();
            //   if (!hosts.Contains(returnUrlHost))
            //   {
            //     return ;
            //   }
            // }else{


            // }
            //var uri = new Uri("http://localhost" + returnUrl);
            //sessionId = HttpUtility.ParseQueryString(uri.Query).Get("sessionId");
            var authorizeCode = returnUrl.Substring(returnUrl.LastIndexOf("/") + 1);
            logger.LogInformation(string.Format("returnUrl={0},authorizeCode={1}", returnUrl, authorizeCode));
            if (string.IsNullOrEmpty(authorizeCode)) return;
            var session = _dbContext.ApiAuthSessions.FirstOrDefault(x => x.SessionId == authorizeCode);
            if (session == null) return;
            session.Token = token;
            session.IsValid = true;
            _dbContext.SaveChanges();
            logger.LogInformation(string.Format("session.token={0},session.isValid={1}", token, session.IsValid));
        }

        public async Task<bool> CustomerValidate(string username, string token)
        {
            var identity = GetIdentity(token);
             logger.LogInformation(string.Format("username={0}, isAuth={1}",identity.Name,identity.IsAuthenticated));
            if (!identity.IsAuthenticated)
            {
                return false;
            }
            var factoryUser = identity.Name;
            var customer = await _userManager.FindByNameAsync(username);
            if (customer == null) return false;
            return (customer.AgentUser == factoryUser);
        }

        private IIdentity GetIdentity(string token)
        {
            var config = AppInstance.Instance.Config;
            var key = Encoding.ASCII.GetBytes(config.Secret);
            var handler = new JwtSecurityTokenHandler();
            var validations = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false
            };
            var claims = handler.ValidateToken(token, validations, out var tokenSecure);
            return claims.Identity;
        }

    }
}