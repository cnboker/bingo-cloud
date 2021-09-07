using System;
using System.Data.SqlClient;
using Microsoft.Extensions.Configuration;

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
                return new SqlConnection(connectionString);
            }
        }

        public System.Data.IDbConnection IdentityConnection
        {
            get
            {
                return new SqlConnection(connectionString);
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