using System;
using System.Net;
using System.Threading.Tasks;
using Member.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using Member.CustomTokenProvider;
using Ioliz.Shared.Pagination;
using Newtonsoft.Json.Linq;
using System.Text.Json;

namespace Member.Controllers
{
    [Route("api/[controller]/[action]")]
    [Authorize()]
    public class UserController : BaseController
    {
        private readonly IolizContext ctx;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly ILogger<AccountController> logger;

        public UserController(IolizContext ctx,
        UserManager<ApplicationUser> userManager,
        ILogger<AccountController> logger
        )
        {
            this.ctx = ctx;
            this.userManager = userManager;
            this.logger = logger;
        }

        [Authorize()]
        [HttpGet()]
        public IActionResult GetUsers([FromQuery] BaseQuery query)
        {
            var data = userManager.Users.Select(x => new
            {
                UserName = x.UserName,
                IsAgent = x.IsAgent,
                Email = x.Email,
                Setting = x.Setting,
                CreateDate = x.CreateDate,
                AgentUser = x.AgentUser
            });
            if (!string.IsNullOrEmpty(query.Keyword))
            {
                data = data.Where(c => c.UserName.Contains(query.Keyword) || c.Email.Contains(query.Keyword));
            }
            //Is factory?
            if (IsAgent())
            {
                data = data.Where(c => c.AgentUser == User.Identity.Name);
            }
            data = data.OrderByDescending(c => c.CreateDate);
            return Ok(data.Pagination(query));
        }

        //admin 获取工厂用户， 工厂用户获取自建用户
        //[AllowAnonymous]
        [HttpGet("/api/user/allUserNames")]
        public IActionResult AllUserNames()
        {
            IQueryable<ApplicationUser> data = null;
            if (IsAdmin())
            {
                data = userManager.Users.Where(c => c.IsAgent);
            }
            else
            {
                data = userManager.Users.Where(x => x.AgentUser == User.Identity.Name);
            }
            var result = data.Select(x => new
            {
                UserName = x.UserName
            }).ToArray();

            return Ok(result);
        }


        [HttpGet("/api/user/getuser/{userName}")]
        public async Task<IActionResult> GetUser(string userName)
        {
            try
            {
                var user = await userManager.FindByNameAsync(userName);

                return Ok(new
                {
                    UserName = user.UserName,
                    IsAgent = user.IsAgent,
                    Email = user.Email,
                    AgentUser = user.AgentUser,
                    Setting = user.Setting
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + ex.StackTrace);
            }

        }

        [Authorize(Roles = "Administrators")]
        [HttpPost("/api/user/setagent/{username}")]
        public async Task<IActionResult> SetAgent(string userName)
        {

            var user = await userManager.FindByNameAsync(userName);

            if (user == null) return BadRequest("{0} not found");
            user.IsAgent = !user.IsAgent;
            await userManager.UpdateAsync(user);
            return Ok();
        }

        //用户的扩展属性都通过该接口来维护
        [HttpGet("/api/user/extender/{userName?}")]
        public async Task<IActionResult> GetUserExtender(string userName)
        {
            if (string.IsNullOrEmpty(userName))
            {
                userName = User.Identity.Name;
            }
            var user = await userManager.FindByNameAsync(userName);

            if (user == null) return BadRequest(string.Format("{0} not found", userName));
            if (string.IsNullOrEmpty(user.Setting)) return Ok(new { });

            return Ok(user.Setting);
        }

        [Authorize]
        //用户的扩展属性都通过该接口来维护
        [HttpPost("/api/user/updateExtender")]
        public async Task<IActionResult> UpdateUserExtender([FromBody] JsonElement settings)
        {
            Console.WriteLine("setting" + settings.ToString());
            var user = await userManager.FindByNameAsync(User.Identity.Name);

            if (user == null) return BadRequest(string.Format("{0} not found", User.Identity.Name));
            //logger.LogInformation("setting data" +  Type.GetType(settings).Name);
            user.Setting = settings.ToString();
            try
            {
                var email = settings.GetProperty("email").GetString();
                if (!string.IsNullOrEmpty(email))
                {
                    var result = await userManager.SetEmailAsync(user, email);
                    if (!result.Succeeded)
                    {
                        return BadRequest(string.Join("\n", result.Errors.Select(x => x.Description)));
                    }
                }
            }
            catch { }

            await userManager.UpdateAsync(user);

            return Ok();
        }

        [Authorize(Roles = "Administrators")]
        [HttpDelete("/api/user/delete/{userName}")]
        public async Task<IActionResult> Delete(string userName)
        {
            var user = await userManager.FindByNameAsync(userName);
            if (user == null) return BadRequest("{0} not found");
            await userManager.DeleteAsync(user);
            return Ok();
        }
    }
}