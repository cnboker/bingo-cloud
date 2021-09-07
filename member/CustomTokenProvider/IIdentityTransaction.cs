using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace Member.CustomTokenProvider{
  public interface IIDentityTransaction{
    Task<bool> CheckPassword(string user, string password);
    //校验token是否是工厂账户， 校验username是否是工厂账户下的子账户， 满足2个条件验证通过
    Task<bool> CustomerValidate(string username,string token);
    Task<IList<string>> GetRoles(string user);
    Task<IList<Claim>> GetRoleClaim(string userName);

    //登录如果带返回链接则处理该链接，首先检查该链接的合法性，非法的链接不产生sessionId
    //这里的返回链接必须是跨域链接才被处理，主要解决跨越token共享的问题
    //合法的链接生成sessionId,同时将token临时保存
    //生成的sessionId会和token一起返回给客户端， 客户端获取到sessionId后，
    //客户端如果检查到有返回链接后，就可以将sessionid作为参数rediect返回链接
    //返回链接可以通过sessionId调用CrossAuthController相应接口获取token
    //Task<string> RequestSession(string token, string returnUrl);
    //设备授权过程
    //设备调用CrossAuthController'sAuthSesionToken创建回话
    //设备生成带有sessionid=xxxxxx的二维码
    //用户扫描二维码打开带有sessionid=xxxxx的登录链接
    //用户输入账号和密码进行授权验证程序，验证程序检查到包含sessionid参数的授权，调用该方法保存保存token的回话
    //设备定时pull CrossAuthController'sGetToken获取token，获取到token后就可以获取证书激活设备
     void  AuthenticateSessionHandle(string token, string returnUrl);
  }
}