using System;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace Member.Controllers
{


  public class BaseController : Controller
  {
    public string GetAgent()
    {
      var clam = User.Claims.FirstOrDefault(c => c.Type == "agentUser");
      if (clam == null) return "";
      return clam.Value;
    }

    //是否是工厂即二级帐号
    public bool IsAgent()
    {
      var clam = User.Claims.FirstOrDefault(c => c.Type == "isAgent");
      if (clam == null) return false;
      return clam.Value == "true";
    }

    public bool IsAdmin()
    {
      return User.Identity.Name == "admin";
    }

  }
}