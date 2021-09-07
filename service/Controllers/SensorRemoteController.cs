using System;
using System.Data;
using System.Linq;
using Dapper;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Ioliz.Service.Controllers {
    public class RemoteControlModel {
        public string SensorId { get; set; }
        public string Data { get; set; }
    }

    [Authorize]
    [Route ("/api[controller]/[action]")]
    public class SensorRemoteController : BaseController {
        public SensorRemoteController (ServiceContext context, ILogger<SensorController> logger) : base (context, logger) {

        }

        [HttpGet ("/api/sensorRemoteControl/{id}")]
        public IActionResult Get (string id) {
            var obj = ctx.SensorRemoteControls.FirstOrDefault (c => c.SensorId == id);
            if (obj == null) {
                return Ok (new {
                    DeviceId = id
                });
            } else {
                return Ok (JsonConvert.DeserializeObject (obj.Data));
            }
        }

        [HttpPost ("/api/sensorRemoteControl/post")]
        public IActionResult Post ([FromBody]RemoteControlModel model) {
            var obj = ctx.SensorRemoteControls.FirstOrDefault (c => c.SensorId == model.SensorId);
            if (obj == null) {
                obj = new SensorRemoteControl(){
                    SensorId = model.SensorId,
                    Data = model.Data
                };
                ctx.SensorRemoteControls.Add (obj);
            } else {
                obj.Data = model.Data;
            }
            ctx.SaveChanges ();
            return Ok ();
        }

    }

}