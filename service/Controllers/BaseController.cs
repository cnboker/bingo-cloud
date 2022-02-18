using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Dapper;

namespace Ioliz.Service.Controllers {

    [Route ("/api/[controller]/[action]")]
    [Authorize]
    //[ApiController]
    public class BaseController : Controller {

        public int PageSize = 30;
        protected readonly ServiceContext ctx;
        protected readonly ILogger<BaseController> logger;

        public System.Data.IDbConnection MemberConnection {
            get {
                Console.WriteLine ("AppInstance.Instance.Config.MemberConnectionString," + AppInstance.Instance.Config.MemberConnectionString);
                return new SqlConnection (AppInstance.Instance.Config.MemberConnectionString);
            }
        }

        public System.Data.IDbConnection  MQTTConnection {
            get {
                //Console.WriteLine ("AppInstance.Instance.Config.MemberConnectionString," + AppInstance.Instance.Config.MemberConnectionString);
                return new SqlConnection (AppInstance.Instance.Config.MQTTConnectionString);
            }
        }

        public System.Data.IDbConnection ServiceConnection {
            get {
                return new SqlConnection (AppInstance.Instance.Config.ServiceConnectionString);
            }
        }

        public BaseController (ServiceContext ctx, ILogger<BaseController> logger) {
            this.ctx = ctx;
            this.logger = logger;
        }

        protected bool IsAdmin () {
            return User.Identity.Name == "admin";
        }

        //获取工厂帐号
        protected string GetAgent () {
            var clam = User.Claims.FirstOrDefault (c => c.Type == "agentUser");
            if (clam == null) return "";
            return clam.Value;
        }

        //是否是工厂即二级帐号
        protected bool IsAgent () {
            var clam = User.Claims.FirstOrDefault (c => c.Type == "isAgent");
            if (clam == null) return false;
            return clam.Value == "true";
        }

        protected UserSetting GetSetting(string userName){
            var sqlText = "select setting from AspNetUsers where UserName=@userName" ;
            UserSetting setting = new UserSetting();
             using (IDbConnection db = MemberConnection)
            {
                var result = db.ExecuteScalar(sqlText,new {userName=userName});
                
                if(result != null){
                   
                    setting = JsonConvert.DeserializeObject<UserSetting>(result.ToString());
                }
                return setting;
            }
        }

    }
}