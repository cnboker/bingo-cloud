using System;
using System.Collections;
using System.Linq;

namespace Ioliz.Service.Models
{
    public class DeviceStateMemoryCache
    {
        static System.Collections.Generic.Dictionary<string, DeviceStateModel> list = new System.Collections.Generic.Dictionary<string, DeviceStateModel>();
        static public void Update(string deviceId)
        {
            if (!list.ContainsKey(deviceId))
            {
                list.Add(deviceId, new DeviceStateModel()
                {
                    DeviceId = deviceId,
                    UpdateDate = DateTime.Now,
                    // Status = NetworkStatus.Running
                });
            }
            else
            {
                var entity = list[deviceId];
                entity.UpdateDate = DateTime.Now;
            }
        }
    
        static public DeviceStateResult[] Get(string[] deviceIds)
        {
            return list.Values.Where(c => deviceIds.Contains(c.DeviceId)).Select(x => new DeviceStateResult
            {
                DeviceId = x.DeviceId,
                NetworkStatus = x.UpdateDate.AddSeconds(60) < DateTime.Now ? NetworkStatus.Offline : NetworkStatus.Running
            }).ToArray();
        }
    }

    public class DeviceStateModel
    {
        public string DeviceId { get; set; }
        public DateTime UpdateDate { get; set; }
        //public NetworkStatus Status { get; set; }
    }

    public class DeviceStateResult
    {
        public string DeviceId { get; set; }

        public NetworkStatus NetworkStatus { get; set; }
    }

    public class DeviceStatusQueryModel{
        public string[] DeviceIds {get;set;}
    }
}