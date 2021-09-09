using System;
using MySql.Data;
using Microsoft.Extensions.Configuration;
using MySql.Data.MySqlClient;

namespace Member.Repositories
{
    public class RepositoryBase
    {

        private string connectionString;
        private string identityConnectionString;

        private readonly IConfiguration configuration;

        public System.Data.IDbConnection MemberConnection
        {
            get
            {
                return new MySqlConnection(connectionString);
            }
        }

        public System.Data.IDbConnection IdentityConnection
        {
            get
            {
                return new MySqlConnection(connectionString);
            }
        }
        public RepositoryBase(IConfiguration configuration)
        {
            this.configuration = configuration;

            connectionString = Microsoft.Extensions.Configuration
            .ConfigurationExtensions.GetConnectionString(this.configuration, "MemberConnection");

            identityConnectionString = Microsoft.Extensions.Configuration
            .ConfigurationExtensions.GetConnectionString(this.configuration, "DefaultConnection");

        }


    }
}