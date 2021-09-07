using Senparc.Weixin.MP;
using Senparc.Weixin.MP.Entities.Request;

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using Microsoft.AspNetCore.Mvc;
using Ioliz.Service;
using Ioliz.Service.Providers;

namespace Ioliz.Service.Controllers
{
    public class WeixinController : Controller
    {
        private IPathProvider pathProvider;
        readonly Func<string> _getRandomFileName = () => DateTime.Now.Ticks + Guid.NewGuid().ToString("n").Substring(0, 6);
        public WeixinController(IPathProvider pathProvider){
            this.pathProvider = pathProvider;
        }
        //
        // GET: /Weixin/

        public ActionResult Index()
        {
            return View();
        }

        /// <summary>
        /// 微信后台验证地址（使用Get），微信后台的“接口配置信息”的Url填写如：http://weixin.senparc.com/weixin
        /// </summary>
        [HttpGet]
        [ActionName("Index")]
        public ActionResult Get(PostModel postModel, string echostr)
        {
            var Token = AppInstance.Instance.Config.WeixinToken;
            if (CheckSignature.Check(postModel.Signature, postModel.Timestamp, postModel.Nonce, Token))
            {
                return Content(echostr);//返回随机字符串则表示验证通过
            }
            else
            {
                return Content("failed:" + postModel.Signature + "," + Senparc.Weixin.MP.CheckSignature.GetSignature(postModel.Timestamp, postModel.Nonce, Token) + "。如果你在浏览器中看到这句话，说明此地址可以被作为微信公众账号后台的Url，请注意保持Token一致。");
            }
        }

        
    }
}
