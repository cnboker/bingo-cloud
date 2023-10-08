using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Ioliz;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;

namespace Member.CustomTokenProvider{
    public class TokenProviderOptions
    { 
        /// <summary>
        /// The relative request path to listen on.
        /// </summary>
        /// <remarks>The default path is <c>/token</c>.</remarks>
       
        public string Path { get; set; } = "/api/token";
         //工厂账户获取子账户TOKEN地址
        public string CustomerPath { get; set; } = "/api/customerToken";

        /// <summary>
        ///  The Issuer (iss) claim for generated tokens.
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// The Audience (aud) claim for the generated tokens.
        /// </summary>
        public string Audience { get; set; }

        /// <summary>
        /// The expiration time for the generated tokens.
        /// </summary>
        /// <remarks>The default is five minutes (300 seconds).</remarks>
        public TimeSpan Expiration { get; set; } = TimeSpan.FromDays(AppConfig.TokenExpired);

        /// <summary>
        /// The signing key to use when generating tokens.
        /// </summary>
        public SigningCredentials SigningCredentials { get; set; }

        /// <summary>
        /// Resolves a user identity given a username and password.
        /// </summary>
        public Func<HttpContext, string, string, Task<ClaimsIdentity>> IdentityResolver { get; set; }

        /// 工厂账户获取子账户token
        public Func<HttpContext, string, string, Task<ClaimsIdentity>> CustomerIdentityResolver { get; set; }


        /// <summary>
        /// Generates a random value (nonce) for each generated token.
        /// </summary>
        /// <remarks>The default nonce is a random GUID.</remarks>
        public Func<Task<string>> NonceGenerator { get; set; }
            = () => Task.FromResult(Guid.NewGuid().ToString());
    }
}