using Dapper;
using System.Data;
using Ioliz.Service.Models;
using System.Collections.Generic;
using System.Linq;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Localization;
using System;

namespace Ioliz.Service.Repositories
{
    public class RepositoryBase
    {


        protected IStringLocalizer localizer;
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
                var existData = data.FirstOrDefault(c => c.Key == i.ToString());
                if (existData != null)
                {
                    list.Add(existData);
                }
                else
                {
                    list.Add(new BarItemObject() {Value = "0", Key = i.ToString() });
                }
            }
            return list.ToArray();
        }

        protected BarItemObject[] PaddingDays(BarItemObject[] data)
        {
            return PaddingItems(data, 1, DateTime.Now.Day);
        }

        protected BarItemObject[] PaddingMonths(BarItemObject[] data)
        {
            return PaddingItems(data, 1, DateTime.Now.Month);
        }


    }
}