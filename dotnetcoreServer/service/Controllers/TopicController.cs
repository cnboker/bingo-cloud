using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Ioliz.Service.Controllers
{

  [Authorize()]
  [Route("api/[controller]")]
  public class TopicController : Controller
  {
    private readonly ServiceContext ctx;
    private ILogger<TopicController> logger;

    public TopicController(ServiceContext context, ILogger<TopicController> logger){
      this.ctx = context;
      this.logger = logger;
    }

    [HttpGet("/api/topic/{catelog}")]
    public IActionResult KeyValues(TopicCatelog catelog){
      if(catelog == TopicCatelog.SensorModel || 
      catelog == TopicCatelog.PWMConfig ||
      catelog == TopicCatelog.BoardInfo ||
      catelog == TopicCatelog.DeviceInfo
      ){
        return GetGlobalTitles(catelog);
      }else if(catelog == TopicCatelog.DeviceGroup){
        return GetUserTitles(catelog);
      }else{
        throw new NotImplementedException();
      }
    }
    //获取全局数据字典
   // [HttpGet("/api/topic/global/{catelog}")]
     IActionResult GetGlobalTitles(TopicCatelog catelog)
    {
      var single = ctx.Topics.FirstOrDefault(x => x.Catelog == catelog);
      if (single == null)
      {
        return Json(new string[]{});
      }
      return Json(single.Content);
    }

    //获取用户键值列表
    //[HttpGet("/api/topic/user/{catelog}")]
     IActionResult GetUserTitles(TopicCatelog catelog)
    {
      var single = ctx.Topics.FirstOrDefault(x => x.Catelog == catelog && x.UserName == User.Identity.Name);
      if (single == null)
      {
        return Json(new string[]{});
      }
      return Json(single.Content);
    
    }

    [HttpPost]
    public void Post([FromBody] Topic newTopic)
    {
      Topic topic = null;
      if(newTopic.Catelog == TopicCatelog.DeviceGroup){
        newTopic.UserName = User.Identity.Name;
      }
      //global topic
      if (string.IsNullOrEmpty(newTopic.UserName))
      {
        topic = ctx.Topics.FirstOrDefault(x => x.Catelog == newTopic.Catelog);
      }
      else
      {
        topic = ctx.Topics.FirstOrDefault(x => x.Catelog == newTopic.Catelog && x.UserName == User.Identity.Name);
      }
      if (topic == null)
      {
        ctx.Topics.Add(newTopic);
      }
      else
      {
        topic.Content = newTopic.Content;
      }
      ctx.SaveChanges();
    }


  }
}