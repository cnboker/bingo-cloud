using System;
using Microsoft.AspNetCore.Mvc;

namespace Member.Models{
  public class LoginModel{
    public string UserName {get;set;}
    public string Password {get;set;}
    public string ReturnUrl {get;set;}
  }

  public class SignupModel{
    public string UserName {get;set;}
    public string Password {get;set;}
    public string Email {get;set;}
  }

  public class TokenModel{
    public int Id {get;set;}
    public string Token {get;set;}
  }
}