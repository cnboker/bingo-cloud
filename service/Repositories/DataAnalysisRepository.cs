using System;
using System.Linq;
using Ioliz.Service.Models;
using Ioliz.Shared.Utils;
using Ioliz.Service;
using System.Net.Http;
using Newtonsoft.Json;
using Ioliz.Service.Repositories;
using Microsoft.Extensions.Configuration;
using System.Data;
using Dapper;
using System.Collections.Generic;

namespace Member.Repositories
{
    public class SensorMessageByDay{
        public string SensorId {get;set;}
        public string Message {get;set;}
        public DateTime CreateDate {get;set;} 
    }
    public class SensorStateByDay
    {
        public string Hour { get; set; }
        public int OnlineCount { get; set; }
        public int OfflineCount { get; set; }
    }
    public class DataAnalysisRepository : RepositoryBase
    {

        //获取每日消息
        public SensorMessageByDay[] GetSensorMessageByDay(string username, DateTime startDate, DateTime endDate)
        {
            var tsql = @"
            SELECT 
                ,[SensorId]
                ,[Message]
                ,[CreateDate]
            FROM [mqttBroker].[dbo].[Message.Hours]
            where sensorId in( select replace(topic,'SENSORS/','') from tbl_messages where userName=@username and topic like 'SENSORS/%')
            and createdate between @start and @end
            Service by createdate
            ";

            using (IDbConnection db = MQTTConnection)
            {
                var result = db.Query<SensorMessageByDay>(tsql, new
                {
                    username = username,
                    start = startDate,
                    end = endDate
                });

                return result.ToArray();
            }

        }
        //客户获取每天的设备在线，离线数目
        public SensorStateByDay[] GetSensorStatusByDay(string username, DateTime startDate, DateTime endDate)
        {
            var tsql = @"           
                declare @sensorIdCount int                
                select  @sensorIdCount = count(0)
                from tbl_messages where userName=@userName and topic like 'SENSORS/%'
                SELECT DATEPART(HOUR, createDate) as hours, count(0) as onlineCount, (@sensorIdCount-count(0)) as offlineCount
                FROM [mqttBroker].[dbo].[Message.Hours] 
                where sensorId in (select replace(topic,'SENSORS/','') from tbl_messages where userName=@username and topic like 'SENSORS/%')
                and createdate between @start and @end
                Service by createdate
                group by  createdate
            ";

            using (IDbConnection db = MQTTConnection)
            {
                var result = db.Query<SensorStateByDay>(tsql, new
                {
                    username = username,
                    start = startDate,
                    end = endDate
                });

                return result.ToArray();
            }
        }
    }
}