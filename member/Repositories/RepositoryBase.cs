using System;
using MySql.Data;
using Microsoft.Extensions.Configuration;
using MySql.Data.MySqlClient;

namespace Member.Repositories
{
    public class RepositoryBase
    {

        private string memberConnectionString;
        private string serviceConnectionString;

        private readonly IConfiguration configuration;

        public System.Data.IDbConnection MemberConnection
        {
            get
            {
                return new MySqlConnection(memberConnectionString);
            }
        }

        public System.Data.IDbConnection ServiceConnection
        {
            get
            {
                return new MySqlConnection(serviceConnectionString);
            }
        }
        public RepositoryBase(IConfiguration configuration)
        {
            this.configuration = configuration;

            memberConnectionString = Microsoft.Extensions.Configuration
            .ConfigurationExtensions.GetConnectionString(this.configuration, "MemberConnection");

            serviceConnectionString = Microsoft.Extensions.Configuration
            .ConfigurationExtensions.GetConnectionString(this.configuration, "ServiceConnection");

        }


    }
}