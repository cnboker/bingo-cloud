using System;
using Microsoft.AspNetCore.Identity;

namespace Member.CustomTokenProvider{
    public class ApplicationUser:IdentityUser{
        public ApplicationUser(){}
        public ApplicationUser(string userName):base(userName){}
        public bool IsAgent {get;set;}
        //该账号的代理商账号
        public string AgentUser {get;set;}
        //用户个性化设置，数据格式为json内容
        public string Setting {get;set;}
        public DateTime? CreateDate {get;set;}
    }
}