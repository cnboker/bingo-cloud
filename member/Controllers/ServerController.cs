using System;
using Microsoft.AspNetCore.Mvc;
using System.Collections;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Member.Models;
using Microsoft.EntityFrameworkCore;

namespace Member.Controllers
{

  [Route("api/[controller]")]
  //server 数据放到验证服务是为了方便验证服务器资源的有效性
  [Authorize(Roles="Administrators")]
  public class ServerController : Controller
  {
    private readonly IolizContext ctx;

    public ServerController(IolizContext ctx)
    {
      this.ctx = ctx;
    }

    [AllowAnonymous]
    [HttpGet("/api/server/trial/{domain}")]
    public bool IsTrial(string domain){
      var server = ctx.Servers.FirstOrDefault(x=>x.Domain == domain);
      if(server == null){
        throw new Exception(domain + " not found");
      }
      return server.IsTrial;
    }

    [AllowAnonymous]
    [HttpGet("/api/server/availiable/{isTrial}")]
    public dynamic Availiable(bool isTrial){
     
      return ctx.Servers.Where(x=>x.Actived 
      ).Select(s=>new {
        Key = s.ServerName,
        Value = s.Domain + "," + s.APIDomain
      });
    }

    [HttpGet(Name = "all")]
    public IEnumerable<Server> GetAll()
    {
      return ctx.Servers.OrderByDescending(x=>x.CreateDate).ToList();
    }

    [HttpGet("{id}", Name = "one")]
    public IActionResult GetById(int id)
    {
      var item = ctx.Servers.FirstOrDefault(c => c.Id == id);
      if (item == null)
      {
        return NotFound();
      }
      return new ObjectResult(item);
    }

    [HttpPost]
    public IActionResult Create([FromBody] Server server)
    {
      if (server == null)
      {
        return BadRequest();
      }
      server.CreateDate = DateTime.Now;
      server.Status = 0;
      this.ctx.Servers.Add(server);
      this.ctx.SaveChanges();
      return CreatedAtAction("GetById", new { id = server.Id }, server);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody]Server server)
    {
      if (server == null || server.Id != id)
      {
        return BadRequest();
      }
      var entity = this.ctx.Servers.FirstOrDefault(c => c.Id == id);
      if (entity == null)
      {
        return NotFound();
      }
      entity.ServerName = server.ServerName;
      entity.Domain = server.Domain;
      entity.IP = server.IP;
      entity.Actived = server.Actived;
      entity.IsTrial = server.IsTrial;
      entity.LastUpdateTime = DateTime.Now;
      entity.EnServerName = server.EnServerName;
      entity.APIDomain = server.APIDomain;
      entity.LastUpdateTime = DateTime.Now;
      //ctx.Servers.Update(server);
      ctx.SaveChanges();
      return CreatedAtAction("GetById", new { id = server.Id }, server);
      //return new NoContentResult();
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
      var item = ctx.Servers.FirstOrDefault(c => c.Id == id);
      if (item == null)
      {
        return NotFound();
      }
      this.ctx.Servers.Remove(item);
      this.ctx.SaveChanges();
      return new NoContentResult();
    }
  }
}