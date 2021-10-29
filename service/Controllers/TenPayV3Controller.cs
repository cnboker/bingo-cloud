using Senparc.Weixin.MP.AdvancedAPIs;
using System;
using System.Linq;

using Senparc.Weixin.MP.TenPayLibV3;
using Senparc.Weixin.MP;
using Microsoft.AspNetCore.Mvc;
using Ioliz.Service.Models;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http.Features;
using Ioliz.Service.Repositories;

namespace Ioliz.Service.Controllers
{

    public class TenPayV3Controller : Controller
    {

        private readonly ServiceContext ctx;
        private readonly ILogger<TenPayV3Controller> logger;

        public TenPayV3Controller(ServiceContext ctx, ILogger<TenPayV3Controller> logger)
        {
            this.ctx = ctx;
            this.logger = logger;
        }

        public ActionResult Index(string ServiceNo, int hc = 0)
        {
            var returnUrl = string.Format("{0}tenpayV3/JsApi/", AppInstance.Instance.Config.Domain);
            var state = string.Format("{0}|{1}", ServiceNo, hc);
            var tenpay = AppInstance.Instance.Config.TenPayV3Info;
            var url = OAuthApi.GetAuthorizeUrl(tenpay.AppId, returnUrl, state, OAuthScope.snsapi_userinfo);
            logger.LogInformation("tenpayv3 index redirect url:" + url);
            return Redirect(url);
        }

        public ActionResult JsApi(string code, string state)
        {
            if (!state.Contains("|"))
            {
                return Content("验证失败！");
            }
            ViewBag.Code = code;
            var stateData = state.Split('|');
            string OrderNo = stateData[0];
            var Order = ctx.Orders.FirstOrDefault(x => x.OrderNo == OrderNo);
            if (OrderNo == null)
            {
                return Content("订单数据不存在");
            }
            if (Order.IsPaid)
            {
                return Redirect("/error?message=该订单已支付,操作失败,订单号:" + OrderNo);
            }
            return View("index", Order);
        }

        public int ServiceStatus(string id)
        {
            var Service = ctx.Orders.FirstOrDefault(x => x.OrderNo == id);
            if (Service == null) throw new ApplicationException("订单不存在");
            return Service.IsPaid ? 1 : 0;
        }

        public ActionResult Finished()
        {
            return View();
        }

        /// <summary>
        /// 获取验证地址
        /// </summary>
        /// <param name="appId"></param>
        /// <param name="redirectUrl"></param>
        /// <param name="state"></param>
        /// <param name="scope"></param>
        /// <param name="responseType"></param>
        /// <returns></returns>
        public string GetAuthorizeUrl(string redirectUrl, string responseType = "code")
        {
            var appSecret = AppInstance.Instance.Config.TenPayV3Info;
            var state = "ironPower$szsong100";
            var appId = appSecret.AppId;
            OAuthScope scope = OAuthScope.snsapi_base;
            var url =
                string.Format("https://open.weixin.qq.com/connect/oauth2/authorize?appid={0}&redirect_uri={1}&response_type={2}&scope={3}&state={4}#wechat_redirect",
                                appId, redirectUrl, responseType, scope, state);

            /* 这一步发送之后，客户会得到授权页面，无论同意或拒绝，都会返回redirectUrl页面。
             * 如果用户同意授权，页面将跳转至 redirect_uri/?code=CODE&state=STATE。这里的code用于换取access_token（和通用接口的access_token不通用）
             * 若用户禁止授权，则重定向后不会带上code参数，仅会带上state参数redirect_uri?state=STATE
             */
            return url;
        }

        /// <summary>
        /// 请求下单
        /// </summary>
        /// <param name="model"></param>
        /// <returns></returns>
        public dynamic GetUnifiedService([FromQuery]UnifiedServiceModel model)
        {

            var appSecret = AppInstance.Instance.Config.TenPayV3Info;
            var token = OAuthApi.GetAccessToken(appSecret.AppId, appSecret.AppSecret, model.Code);
            var openId = token.openid;
            logger.LogInformation("getUnifiedService code:" + model.Code);
            logger.LogInformation("openid:" + token.openid);
            model.Body = "许可费用";

            //获取产品信息
            var Order = ctx.Orders.FirstOrDefault(c => c.OrderNo == model.OrderNo);
            if (Order == null)
            {
                throw new ApplicationException("订单不能为空");
            }

            string timeStamp = "";
            string nonceStr = "";
            string paySign = "";

            //当前时间 yyyyMMdd
            string date = DateTime.Now.ToString("yyyyMMdd");


            timeStamp = TenPayV3Util.GetTimestamp();
            nonceStr = TenPayV3Util.GetNoncestr();
            //金额单位为分
            //实时上传以订单金额为准
            //有回话无订单跳过订单处理走解锁流程
            if (Order.IsPaid)
            {
                string errMsg = "该订单已支付,操作失败,订单号:" + Order.OrderNo;
                ThrowError(errMsg);
            }
            var amount = Convert.ToInt32(Order.Amount * 100);
            if (amount <= 0)
            {
                ThrowError("订单金额不能为0, ServiceNo:" + Order.OrderNo);
            }
            //amount = 1;
            var address = this.HttpContext.Features.Get<IHttpConnectionFeature>().RemoteIpAddress.ToString();

            var sp_billno = model.OrderNo;
            var xmlDataInfo = new TenPayV3UnifiedorderRequestData(
            appSecret.AppId,
            appSecret.MchId,
            model.Body,
            sp_billno,
            amount,
            address,
            appSecret.TenPayV3Notify,
            TenPayV3Type.JSAPI,
             openId,
             appSecret.Key,
             nonceStr);
            //string s = xmlDataInfo.PackageRequestHandler.ParseXML();
            // logger.LogInformation("TenPayV3UnifiedServiceRequestData:" + s);
            var result = TenPayV3.Unifiedorder(xmlDataInfo);


            string prepayId = result.prepay_id;

            //设置支付参数
            RequestHandler paySignReqHandler = new RequestHandler(null);
            paySignReqHandler.SetParameter("appId", appSecret.AppId);
            paySignReqHandler.SetParameter("timeStamp", timeStamp);
            paySignReqHandler.SetParameter("nonceStr", nonceStr);
            paySignReqHandler.SetParameter("package", string.Format("prepay_id={0}", prepayId));
            paySignReqHandler.SetParameter("signType", "MD5");
            paySign = paySignReqHandler.CreateMd5Sign("key", appSecret.Key);
            logger.LogInformation("prepayId:" + prepayId);
            return new
            {
                appId = appSecret.AppId,
                timeStamp = timeStamp,
                nonceStr = nonceStr,
                package = string.Format("prepay_id={0}", prepayId),
                signType = "MD5",
                paySign = paySign
            };
        }

        private void ThrowError(string errMsg)
        {
            logger.LogError(errMsg);
            throw new ApplicationException(errMsg);
        }

        [HttpPost]
        public ActionResult PayNotifyUrl()
        {
            ResponseHandler resHandler = new ResponseHandler(Request.HttpContext);
            var appSecret = AppInstance.Instance.Config.TenPayV3Info;
            string return_code = resHandler.GetParameter("return_code");
            string return_msg = resHandler.GetParameter("return_msg");
            
            logger.LogInformation(resHandler.GetDebugInfo());
            resHandler.SetKey(appSecret.Key);
            string OrderNo = "";
            //验证请求是否从微信发过来（安全）
            if (resHandler.IsTenpaySign() && return_code == "SUCCESS")
            {
                //正确的订单处理
                OrderNo = resHandler.GetParameter("out_trade_no");           
                OrderRepository ServiceRepository = new OrderRepository(this.ctx);
                try
                {
                    ServiceRepository.Checkout(User.Identity.Name, OrderNo, PayMethod.Weixin);
                }
                catch (Exception ex)
                {
                    logger.LogCritical(ex.Message + ex.StackTrace);
                }
            }
            else
            {
                ThrowError("付款失败,OrderNo=" + resHandler.GetParameter("out_trade_no"));
            }
            return Content("");
        }

    }


}
