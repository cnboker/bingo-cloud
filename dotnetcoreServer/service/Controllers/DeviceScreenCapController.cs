using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ioliz.Service.Controllers;

public class ScreenCapModel
{
    public string Key { get; set; }
    public string Content { get; set; }
}

[Authorize]
[Route("/api/[controller]/[action")]
public class DeviceScreenCapController : Controller
{
    static System.Collections.Generic.Dictionary<string, ScreenCapModel> list = new System.Collections.Generic.Dictionary<string, ScreenCapModel>();
    [HttpGet("/api/screenshot/{id}")]
    public IActionResult Get(string id)
    {
        var entry = list[id];
        if (entry == null) return Json(new { key = id, content = "" });
        list.Remove(id);
        return Json(entry);
    }

    [HttpGet("/api/screenshot/clear")]
    public IActionResult Clear()
    {
        list.Clear();
        return Ok();
    }
    [HttpPost("/api/snapshot")]
    public IActionResult Post(ScreenCapModel model)
    {
        var entry = list[model.Key];
        if (entry == null)
        {
            entry.Content = model.Content;
        }
        else
        {
            list.Add(model.Key, model);
        }
        return Ok();
    }
}