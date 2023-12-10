
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Ioliz.Service.Controllers;

[Route("/api/[controller]/[action]")]
//[Authorize(Roles = "Administrators")]
public class ConfigController : Controller
{
    private readonly ServiceContext ctx;
    private readonly ILogger<ConfigController> logger;
    public ConfigController(ServiceContext ctx, ILogger<ConfigController> logger)
    {
        this.ctx = ctx;
        this.logger = logger;
    }

    public IEnumerable<KeyValue> GetAll() => ctx.KeyValues.ToList();

    [HttpPost]
    public IActionResult Update([FromBody] IList<KeyValue> list)
    {
        var original = ctx.KeyValues.ToList();
        foreach (var item in list)
        {
            logger.LogInformation(string.Format("key:{0},value:{1}", item.Key, item.Value));
            var old = original.FirstOrDefault(x => x.Key == item.Key);
            if (old == null)
            {
                ctx.KeyValues.Add(item);
            }
            else
            {
                if (old.Value != item.Value)
                {
                    old.Value = item.Value;
                }
            }

        }
        ctx.SaveChanges();

        AppInstance.Instance.Config.LoadKeyValues();
        return Ok();
    }

    [Authorize]
    [HttpGet("/api/requestConfig")]
    public IActionResult RequestConfig()
    {
        var config = AppInstance.Instance.Config;
        return Ok(new
        {
            FileServer = config.FileServer,
            MQTTServer = AppInstance.Instance.Config.MQTTServer,
            UserName = User.Identity.Name
        });
    }

}