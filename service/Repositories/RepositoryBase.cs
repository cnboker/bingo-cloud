using Dapper;
using System.Data;
using Ioliz.Service.Models;
using System.Collections.Generic;
using System.Linq;
using MySql.Data.MySqlClient;

namespace Ioliz.Service.Repositories
{
    public class RepositoryBase
    {

        public System.Data.IDbConnection MemberConnection
        {
            get
            {
                return new MySqlConnection(AppInstance.Instance.Config.MemberConnectionString);
            }
        }

        public System.Data.IDbConnection ServiceConnection
        {
            get
            {
                return new MySqlConnection(AppInstance.Instance.Config.ServiceConnectionString);
            }
        }

        public System.Data.IDbConnection MQTTConnection
        {
            get
            {
                return new MySqlConnection(AppInstance.Instance.Config.MQTTConnectionString);
            }
        }

        public string[] GetSensorIdsByFactory(string userName)
        {
            return GetSensorIds(userName, true);
        }
        public string[] GetSensorIdsByUser(string userName)
        {
            return GetSensorIds(userName, false);
        }

        private string[] GetSensorIds(string userName, bool isFactory)
        {
            var column = "userName";
            if (isFactory)
            {
                column = "factory";
            }
            var sqlText = string.Format(@"
                    select sensorId
                    FROM sensorMessageView where {0} =@userName", column);

            using (IDbConnection db = MemberConnection)
            {
                var result = db.Query<string>(sqlText, new { userName = userName });

                return result.AsList().ToArray();
            }
        }

        public RepositoryBase()
        {

        }



        protected BarItemObject[] PaddingHours(BarItemObject[] data)
        {
            return PaddingItems(data, 0, 23);
        }

        protected BarItemObject[] PaddingItems(BarItemObject[] data, int startIndex, int paddingRowCount)
        {
            return data;
            string unit="时";
            if(paddingRowCount == 12){
                unit = "月";
            }else if(paddingRowCount == 31){
                unit = "日";
            }
            List<BarItemObject> list = new List<BarItemObject>();
            for (var i = startIndex; i <= paddingRowCount; i++)
            {
                var existData = data.FirstOrDefault(c => c.K == i);
                if (existData != null)
                {
                    list.Add(existData);
                }
                else
                {
                    list.Add(new BarItemObject() { K = i, Value = "0", Key=i+unit });
                }
            }
            return list.ToArray();
        }

        protected BarItemObject[] PaddingDays(BarItemObject[] data)
        {
            return PaddingItems(data, 1, 31);
        }

        protected BarItemObject[] PaddingMonths(BarItemObject[] data)
        {
            return PaddingItems(data, 1, 12);
        }

        protected BarItemObject[] ExecuteSQL(string tsql,object param = null)
        {
            using (IDbConnection db = MQTTConnection)
            {
                var result = db.Query<BarItemObject>(tsql,param);

                return result.ToArray();
            }
        }

        protected string getWhere(string[] sensorIds)
        {
            return string.Format(" sensorId in ({0})", string.Join(",", sensorIds.Select(c => "'" + c + "'")));
        }
    }
}