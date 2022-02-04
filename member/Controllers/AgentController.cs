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

namespace Member.Controllers
{
    [Route("api/[controller]/[action]")]
    [Authorize()]
    public class AgentUserController : Controller
    {
        private readonly IolizContext ctx;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly ILogger<AccountController> logger;

        public AgentUserController(IolizContext ctx,
        UserManager<ApplicationUser> userManager,
        ILogger<AccountController> logger
        )
        {
            this.ctx = ctx;
            this.userManager = userManager;
            this.logger = logger;
        }

        [HttpGet]
        public IActionResult GetUsers()
        {
            return Ok(userManager.Users.Where(x => x.AgentUser == User.Identity.Name).Select(x => new
            {
                Id = x.UserName,
                UserName = x.UserName,
                Email = x.Email
            }).ToList());
        }

        [HttpGet("/api/agentUser/{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var x = await userManager.FindByNameAsync(id);
            if (x == null)
            {
                return NotFound();
            }
            return new ObjectResult(new
            {
                Id = x.UserName,
                UserName = x.UserName,
                Email = x.Email
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SignupModel user)
        {
            if (user == null)
            {
                return BadRequest();
            }
            try
            {
                var newUser = new ApplicationUser(user.UserName);
                newUser.CreateDate = DateTime.Now;
                newUser.Email = user.Email;
                newUser.AgentUser = User.Identity.Name;
                newUser.IsAgent = false;
                newUser.SecurityStamp = Guid.NewGuid().ToString();
                var result = await userManager.CreateAsync(newUser, user.Password);
                await userManager.SetLockoutEnabledAsync(newUser, true);
                if(result.Succeeded){
                    return Ok(newUser);
                }else{
                     return BadRequest(string.Join(",",result.Errors.Select(c=>c.Description).ToArray()));
                }
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }

          //  return CreatedAtAction("GetById", new { userName = user.UserName }, user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody]SignupModel user)
        {

            var entity = await userManager.FindByNameAsync(id);
            if (entity.AgentUser != User.Identity.Name)
            {
                return BadRequest("invalid argument");
            }
            if (entity == null)
            {
                return NotFound();
            }
            entity.UserName = user.UserName;
            entity.Email = user.Email;
            await userManager.UpdateAsync(entity);
            return Ok(entity);
            //return CreatedAtAction("GetById", new { userName = user.UserName }, user);
            //return new NoContentResult();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var item = await userManager.FindByNameAsync(id);
            if (item.AgentUser != User.Identity.Name)
            {
                return BadRequest("invalid argument");
            }
            if (item == null)
            {
                return NotFound();
            }
            await userManager.DeleteAsync(item);
            return new NoContentResult();
        }

    }
}