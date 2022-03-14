using Dapper;
using System.Data;
using Ioliz.Service.Models;
using System.Collections.Generic;
using System.Linq;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Localization;

namespace Ioliz.Service.Repositories
{
    public class RepositoryBase
    {


        private IStringLocalizer localizer;
        public RepositoryBase()
        {
        }

        public RepositoryBase(IStringLocalizer localizer)
        {
            this.localizer = localizer;
        }
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

        protected BarItemObject[] PaddingHours(BarItemObject[] data)
        {
            return PaddingItems(data, 0, 23);
        }

        protected BarItemObject[] PaddingItems(BarItemObject[] data, int startIndex, int paddingRowCount)
        {
            string unit = localizer["Hour"];
            if (paddingRowCount == 12)
            {
                unit = localizer["Month"];
            }
            else if (paddingRowCount == 31)
            {
                unit = localizer["Day"];
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
                    list.Add(new BarItemObject() { K = i, Value = "0", Key = i + unit });
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

        protected BarItemObject[] ExecuteSQL(string tsql, object param = null)
        {
            using (IDbConnection db = MQTTConnection)
            {
                var result = db.Query<BarItemObject>(tsql, param);

                return result.ToArray();
            }
        }


    }
}