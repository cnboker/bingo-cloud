using System.Collections.Generic;
using System.Linq;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ioliz.Service.Controllers
{
  [Route("/api/[controller]/[action]")]
  public class ValuesController : Controller
  {
    // GET api/values
    [HttpGet]
    [Authorize(Roles = "Administrators")]
    public IEnumerable<string> GetAll()
    {
      return new string[] { "value1", "value2" };
    }

    //http://localhost:5001/api/test/hello
    [AllowAnonymous]
    [HttpGet("/api/test/{id}")]
    public IActionResult Parameter(string id)
    {
      return Ok("parameter id=" + id);
    }

    //http://localhost:5001/api/test?name=scott
    [AllowAnonymous]
    [HttpGet("/api/test")]
    public IActionResult FromQuery([FromQuery] string name)
    {
      return Ok("my name=" + name);
    }

    //http://localhost:5001/api/test2?name=scott&age=30
    [AllowAnonymous]
    [HttpGet("/api/test2")]
    public IActionResult FromQuery([FromQuery] string name, [FromQuery] int age)
    {
      return Ok("my name=" + name + ",age=" + age);
    }

    //http://localhost:5001/api/test3/hello?name=scott&age=30
    [AllowAnonymous]
    [HttpGet("/api/test3/{id}")]
    public IActionResult FromQuery2(string id, [FromQuery] string name, [FromQuery] int age)
    {
      return Ok(id + " my name=" + name + ",age=" + age);
    }

    //http://localhost:5001/api/test4/hello?name=scott&age=30
    [AllowAnonymous]
    [HttpGet("/api/test4/{id}")]
    public string FromQuery3(string id, [FromQuery] string name, [FromQuery] int age)
    {
      return id + " my name=" + name + ",age=" + age;
    }

     [HttpGet("/api/sensor/recently7DaysMessages/{sensorId}")]
    //colums:sensorId,part,remark,status,createDate
    public string Rencently7DaysList1<T>(string sensorId,[FromQuery] int page, [FromQuery] int part) where T : ITSQLPaginationResult
    {
        return "hello world";
    }

    [HttpGet("/api/sensor/recently7DaysMessages/{sensorId}")]
    //colums:sensorId,part,remark,status,createDate
    public ResultSet<T> Rencently7DaysList<T>(string sensorId,[FromQuery] int page, [FromQuery] int part) where T : ITSQLPaginationResult
    {
        return new ResultSet<T>
        {
          Records = null,
          PageCount = 10
        };
    }

    [Authorize]
    [HttpGet("claims")]
    public object Claims()
    {

      return User.Claims.Select(c => new
      {
        Type = c.Type,
        Value = c.Value
      });
    }
    // GET api/values/5
    // [HttpGet("{id}")]
    // public string Get(int id)
    // {
    //     return "value";
    // }

    // POST api/values
    [HttpPost]
    public void Post([FromBody] string value)
    {
    }

    // PUT api/values/5
    [HttpPut("{id}")]
    public void Put(int id, [FromBody] string value)
    {
    }

    // DELETE api/values/5
    [HttpDelete("{id}")]
    public void Delete(int id)
    {
    }
  }
}
