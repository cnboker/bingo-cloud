using System;
using System.ComponentModel.DataAnnotations;

namespace Member.Models
{
    public class ResetPasswordModel
    {
        public string UserName { get; set; }
        public string OldPassword {get;set;}

        public string Password { get; set; }
        public string ConfirmPassword { get; set; }


        public string Token { get; set; }

        public string Email {get;set;}
    }
}