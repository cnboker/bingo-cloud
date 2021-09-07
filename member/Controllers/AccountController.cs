using System;
using System.Net;
using System.Threading.Tasks;
using Member.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using Member.CustomTokenProvider;
using Member.Repositories;
using Microsoft.Extensions.Configuration;
using System.Web;

namespace Member.Controllers
{

    public class AccountController : BaseController
    {
        private readonly ILogger logger;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly SignInManager<ApplicationUser> loginManager;
        private readonly IConfiguration configuration;
        public AccountController(ILogger<AccountController> logger,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> loginManager,
        IConfiguration configuration
        )
        {
            this.logger = logger;
            this.userManager = userManager;
            this.loginManager = loginManager;
            this.configuration = configuration;
        }


        //获取工厂帐号

        [AllowAnonymous]
        [HttpPost("/api/signup")]
        public async Task<IActionResult> Signup([FromBody] SignupModel model)
        {
            try
            {
                //检测是否是验证用户创建
                //如果是代理商帐号创建帐号，更新代理商
                var agentUser = "";
                if (IsAgent())
                {
                    agentUser = User.Identity.Name;
                }
                var user = new ApplicationUser() { UserName = model.UserName, Email = model.Email, CreateDate = DateTime.Now, AgentUser = agentUser };
                var result = await userManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {

                    var code = await userManager.GenerateEmailConfirmationTokenAsync(user);
                    var callbackUrl = Url.EmailConfirmationLink(user.Id, code, Request.Scheme);
                    //logger.LogInformation("EmailConfirmationLink," + callbackUrl);
                    MailRepository mailRep = new MailRepository(this.configuration);
                    mailRep.Send(user.Email, "Confirm Email", MailTemplate.EmailConfirm.ToString(), callbackUrl);
                    //mailRep.Send(user.Email, "Confirm Email", string.Format("click the link below to Confirm Email <br/><a href=\"{0}\">activiate account</a>", callbackUrl));

                    return Ok();
                }
                else
                {
                    return BadRequest(string.Join(",", result.Errors.Select(c => c.Description).ToArray()));
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex.Message + ex.StackTrace);
                return BadRequest(ex.Message);
            }

        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null)
                return BadRequest("userId not null");
            var user = await userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new ApplicationException($"Unable to load user with ID '{userId}'.");
            }
            var result = await userManager.ConfirmEmailAsync(user, code);

            return Ok(result.Succeeded ? "ConfirmEmail" : "Error");
        }

        [HttpPost]
        [Route("/api/account/forgetPassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] ResetPasswordModel model)
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null || !(await userManager.IsEmailConfirmedAsync(user)))
            {
                return BadRequest("Error while resetting your password!");
            }
            var token = await userManager.GeneratePasswordResetTokenAsync(user);

            var resetLink = string.Format("{0}/account/resetpassword?token={1}&email={2}", Request.Headers["Origin"], HttpUtility.UrlEncode(token), model.Email);
            //send email
            MailRepository mailRep = new MailRepository(this.configuration);
            //mailRep.Send(user.Email, "Reset password", string.Format("Click the link below to reset your password <br/><a href=\"{0}\">Reset password</a>", resetLink));
            mailRep.Send(user.Email, "Reset password", MailTemplate.ResetPassword.ToString(), resetLink);
            return Ok("Mail for reset password has been sent to you mailbox,please click the mail link to reset your password.");
        }

        [HttpPost]
        [Route("/api/account/resetpassword")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel model)
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                return BadRequest("userName does not exist!");
            }
            var token = HttpUtility.UrlDecode(model.Token).Replace(" ", "+");
            var result = await userManager.ResetPasswordAsync(user, token, model.Password);
            if (result.Succeeded)
            {
                return Ok();
            }
            else
            {
                return BadRequest(string.Join("<br/>", result.Errors.Select(x => x.Description).ToArray()));
            }
        }

        //重置不需要邮件验证
        [Authorize()]
        [HttpPost]
        [Route("/api/account/resetPassword1")]
        public async Task<IActionResult> ResetPassword1([FromBody] ResetPasswordModel model)
        {           
            var user = await userManager.FindByNameAsync(User.Identity.Name);
            if (user == null)
            {
                return BadRequest("userName does not exist!");
            }
            Console.WriteLine("password:" + model.OldPassword +  model.Password);
            var result = await userManager.ChangePasswordAsync(user, model.OldPassword, model.Password);
            if (result.Succeeded)
            {
                return Ok();
            }
            else
            {
                return BadRequest(string.Join(",", result.Errors.Select(x => x.Description).ToArray()));
            }
        }



    }
}