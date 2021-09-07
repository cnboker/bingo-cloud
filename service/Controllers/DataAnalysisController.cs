using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using Ioliz.Service.Repositories;
using System.Security.Claims;
using System.Collections;
using System.Linq;

namespace Ioliz.Service.Controllers
{

    public enum DateTypeEnum
    {
        Year,
        Month,
        Day
    }
    public class DataQueryModel
    {
        public string DateType { get; set; }
        public DateTime DateTime { get; set; }
        public string SensorIds { get; set; }
    }

    [Authorize]
    [Route("/api/[controller]/[action]")]
    public class DataAnalysisController : BaseController
    {

        SensorStateRepository rep = null;
        PowerRepository powerRepository = null;
        MessageRepository messageRepository = null;
        public DataAnalysisController(ServiceContext context, ILogger<DataAnalysisController> logger)
        : base(context, logger)
        {
            rep = new SensorStateRepository();
            powerRepository = new PowerRepository();
            messageRepository = new MessageRepository();
        }

        //设备在线情况
        [HttpPost("/api/data/sensorState")]
        public IActionResult SensorState([FromBody] DataQueryModel model)
        {
            DateTypeEnum type = (DateTypeEnum)Enum.Parse(typeof(DateTypeEnum), model.DateType, true);
            var date = model.DateTime;
            int year = date.Year;
            int month = date.Month;
            BarItemObject[] result = null;
            if (type == DateTypeEnum.Day)
            {
                result = rep.GetSensorStateByDay(User.Identity.Name, date);
            }
            else if (type == DateTypeEnum.Month)
            {
                result = rep.GetSensorStateByMonth(User.Identity.Name, year, month);
            }
            else if (type == DateTypeEnum.Year)
            {
                result = rep.GetSensorStateByYear(User.Identity.Name, year);
            }
            return Ok(result);
        }

        //消息数据统计
        [HttpPost("/api/data/message")]
        public IActionResult MessageStats([FromBody] DataQueryModel model){
              if (string.IsNullOrEmpty(model.SensorIds))
            {
                return BadRequest("请选择设备");
            }
            DateTypeEnum type = (DateTypeEnum)Enum.Parse(typeof(DateTypeEnum), model.DateType, true);
            var date = model.DateTime;
            int year = date.Year;
            int month = date.Month;
            //var sensorIds = powerRepository.GetSensorIdsByUser(User.Identity.Name);
            var sensorIds = model.SensorIds.Split(",".ToCharArray());
            Hashtable hash = new System.Collections.Hashtable();
            BarItemObject[] result = null;
            for (int i = 0; i < sensorIds.Length; i++)
            {
                if (type == DateTypeEnum.Day)
                {
                    result = messageRepository.GetMessageByDay(new string[]{sensorIds[i]}, date);
                }
                else if (type == DateTypeEnum.Month)
                {
                    result = messageRepository.GetMessageByMonth(new string[]{sensorIds[i]}, year, month);
                }
                else if (type == DateTypeEnum.Year)
                {
                    result = messageRepository.GetMessageByYear(new string[]{sensorIds[i]}, year);
                }
                hash.Add(sensorIds[i], result);
            }
            ArrayList list = new ArrayList();
            foreach(var  key in hash.Keys){
                var arr = hash[key] as BarItemObject[];
                list.Add(new {
                    name = key,
                    type = "line",
                    data = arr.Select(c=>c.Value).ToArray()
                });
            }
            return Ok(list.ToArray());
        }

        //用电使用情况
        [HttpPost("/api/data/powerStats")]
        public IActionResult PowerState([FromBody] DataQueryModel model)
        {
            if (string.IsNullOrEmpty(model.SensorIds))
            {
                return BadRequest("请选择设备");
            }

            DateTypeEnum type = (DateTypeEnum)Enum.Parse(typeof(DateTypeEnum), model.DateType, true);
            var date = model.DateTime;
            int year = date.Year;
            int month = date.Month;
            //var sensorIds = powerRepository.GetSensorIdsByUser(User.Identity.Name);
            var sensorIds = model.SensorIds.Split(",".ToCharArray());
            Hashtable hash = new System.Collections.Hashtable();
            BarItemObject[] result = null;
            for (int i = 0; i < sensorIds.Length; i++)
            {
                if (type == DateTypeEnum.Day)
                {
                    result = powerRepository.GetPowerByDay(new string[]{sensorIds[i]}, date);
                }
                else if (type == DateTypeEnum.Month)
                {
                    result = powerRepository.GetMonthPower(new string[]{sensorIds[i]}, year, month);
                }
                else if (type == DateTypeEnum.Year)
                {
                    result = powerRepository.GetYearPower(new string[]{sensorIds[i]}, year);
                }
                hash.Add(sensorIds[i], result);
            }
            ArrayList list = new ArrayList();
            foreach(var  key in hash.Keys){
                var arr = hash[key] as BarItemObject[];
                list.Add(new {
                    name = key,
                    type = "line",
                    data = arr.Select(c=>c.Value).ToArray()
                });
            }
            return Ok(list.ToArray());
        }


        //设备信息数据统计
        [HttpPost("/api/data/messageStats")]
        public IActionResult MessageState([FromBody] DataQueryModel model)
        {
            return null;
        }
    }
}