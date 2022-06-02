using System;
using Ioliz.Service.Models;

namespace Ioliz.Service.Models
{
    public class UserSetting
    {
        public string Email { get; set; }
        //信发系统短信接收手机号
        public string Mobile1 {get;set;}
        //环控系统短信接收手机号
        public string Mobile2 {get;set;}
        //是否接受7天过期短信
        public string Day7Notify {get;set;}
    }
}