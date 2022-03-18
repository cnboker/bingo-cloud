using System;
using System.Linq;
using Ioliz;
using Member.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Member.Controllers
{
  //流程步骤
  //设备调用api/authSession
  //用户扫描包含sessionid的二维码， 用户登录， 系统捕获验证后的token并存储
  //设备通过sessionid获取刚存储的token
  //设备上传设备信息，因为设备已经获取到token所以系统可以设备到是那个用户的设备信息
  //用户进入授权页面，对设备进行授权，系统进入授权许可流程

  //不同程序间token共享接口
  public class CrossAuthController : Controller
  {

    private readonly IolizContext ctx;
    private readonly ILogger<CrossAuthController> logger;
    public CrossAuthController(IolizContext ctx, ILogger<CrossAuthController> logger)
    {
      this.ctx = ctx;
      this.logger = logger;
    }

    //[FromForm]以application/x-www-form-urlencoded
    [HttpPost("api/authSession")]
    public QRResult AuthSession([FromForm]string sessionid)
    {
      logger.LogInformation("AuthSession parameter sessionid=" + sessionid);
      if (string.IsNullOrEmpty(sessionid)) return new QRResult();
      ApiAuthSession session = new ApiAuthSession();
      session.SessionId = sessionid;
      session.CreateDate = DateTime.Now;
      session.Token = "";
      ctx.ApiAuthSessions.Add(session);
      ctx.SaveChanges();
      var config = AppInstance.Instance.Config;
      var qrUrl = config.AppHost + "/#authorize/" + sessionid;
      logger.LogInformation("AuthSession parameter qrUrl=" + qrUrl);
      return new QRResult()
      {
        AuthorizeCode = sessionid,
        QRUrl = qrUrl
      };
    }

    [Authorize]
    //在授权页面，app上传token
    [HttpPost("api/authSessionToken/{sessionId}")]
    public IActionResult AuthSessionToken(string sessionId)
    {
      Microsoft.Extensions.Primitives.StringValues accessToken;
      HttpContext.Request.Headers.TryGetValue("Authorization", out accessToken);
      logger.LogInformation("accessToken=" + accessToken.ToString());
      var session = ctx.ApiAuthSessions.FirstOrDefault(x => x.SessionId == sessionId);
      if (session == null) return BadRequest();

      session.Token = accessToken.ToString().Substring(7);
      session.IsValid = true;
      this.ctx.SaveChanges();
      return new NoContentResult();
    }


    [HttpGet("api/crossToken/{sessionId}")]
    public IActionResult GetToken(string sessionId)
    {
      if (string.IsNullOrEmpty(sessionId)) return BadRequest("sessionId cann't null");
      var session = ctx.ApiAuthSessions.FirstOrDefault(x => x.SessionId == sessionId);
      if (session == null) return BadRequest("session object not found");
      //if (!session.IsValid) throw new Exception("会话已失效");
      if (DateTime.Now.Subtract(session.CreateDate.Value).TotalMinutes > AppConfig.TokenExpired)
      {
        session.IsValid = false;
        ctx.SaveChanges();
        throw new Exception("会话已失效");
      }
      if (!string.IsNullOrEmpty(session.Token))
      {
        session.IsValid = false;
        session.ExecuteDate = DateTime.Now;
        ctx.SaveChanges();
      }
      return Ok(new { session_id = sessionId, access_token = session.Token });
    }
  }
}