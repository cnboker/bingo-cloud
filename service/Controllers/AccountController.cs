using Ioliz.Service;
using Ioliz.Service.Controllers;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace Ioliz.Service.Controllers
{
    [Route("/api/[controller]/[action]")]
    [Authorize(Roles = "Administrators")]
    public class AccountController : BaseController
    {
        public AccountController(ServiceContext ctx, ILogger<AccountController> logger) : base(ctx, logger)
        {
        }

        [HttpPost]
        [Authorize(Roles = "Administrators")]
        public IActionResult Detail([FromBody] SimpleQueryModel model)
        {
            var q = ctx.AccountDetails.AsQueryable();
            if (model.StartDate.HasValue)
            {
                q = q.Where(x => x.TransTime > model.StartDate);
            }
            if (model.EndDate.HasValue)
            {
                q = q.Where(x => x.TransTime < model.EndDate);
            }
            if (!string.IsNullOrEmpty(model.TenantName))
            {
                q = q.Where(x => x.FromUserName == model.TenantName);
            }
            var result = q.OrderByDescending(x => x.TransTime).Pagination(model);
            logger.LogInformation("model.page" + model.Page.ToString());
            return Json(result);
        }

    }
}