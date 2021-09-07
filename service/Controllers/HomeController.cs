using System;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Ioliz.Service.Controllers
{
  public class HomeController : Controller
  {
    private readonly ServiceContext ctx;
    private ILogger<HomeController> logger;
    public HomeController(ServiceContext context, ILogger<HomeController> logger)
    {
      this.ctx = context;
      this.logger = logger;
    }

    public ActionResult Index(){
        return View();
    }
  }
}