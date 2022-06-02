using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Generic;

namespace Member.CustomTokenProvider
{
    public class TokenProviderMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly TokenProviderOptions _options;
        private readonly JsonSerializerSettings _serializerSettings;

        public TokenProviderMiddleware(
            RequestDelegate next,
            IOptions<TokenProviderOptions> options)
        {
            _next = next;

            _options = options.Value;
            ThrowIfInvalidOptions(_options);

            _serializerSettings = new JsonSerializerSettings
            {
                Formatting = Formatting.Indented
            };
        }

        public Task Invoke(HttpContext context)
        {
          /// Console.WriteLine(context.Request.Path + ":" + _options.Path);
            if (context.Request.Path.Equals(_options.Path, StringComparison.Ordinal))
            {
             
                if (!context.Request.Method.Equals("POST")
                 || !context.Request.HasFormContentType)
                {
                    context.Response.StatusCode = 400;
                    return context.Response.WriteAsync("Bad request.");
                }
                return GenerateToken(context);
            }
            if (context.Request.Path.Equals(_options.CustomerPath, StringComparison.Ordinal))
            {
                if (!context.Request.Method.Equals("POST")
                 || !context.Request.HasFormContentType)
                {
                    context.Response.StatusCode = 400;
                    return context.Response.WriteAsync("Bad request.");
                }
                return CustomerGenerateToken(context);
            }

            return _next(context);

        }


        private async Task CustomerGenerateToken(HttpContext context)
        {
            var username = context.Request.Form["userName"];
            var token = context.Request.Form["token"];

            var identity = await _options.CustomerIdentityResolver(context, username, token);

            if (identity == null)
            {
                context.Response.StatusCode = 400;
                //context.Response.
                //context.Response.
                await context.Response.WriteAsync("Invalid_username_or_token");
                return;
            }
               var now = DateTime.UtcNow;

            //http://www.jerriepelser.com/blog/aspnetcore-jwt-saving-bearer-token-as-claim/
            //增加access_token方便controller访问它
            identity.AddClaims(new Claim[]
                {
          new Claim(JwtRegisteredClaimNames.Sub, username),
          new Claim(JwtRegisteredClaimNames.Jti, await _options.NonceGenerator()),
          new Claim(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUniversalTime().ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                });
            //IIDentityTransaction it = context.RequestServices.GetService<IIDentityTransaction>();
            // var userRoles = await it.GetRoleClaim(username);
            //claims.AddRange(userRoles);
            // Create the JWT and write it to a string
            var jwt = new JwtSecurityToken(
                issuer: _options.Issuer,

                audience: _options.Audience,
                claims: identity.Claims,
                notBefore: now,
                expires: now.Add(_options.Expiration),
                signingCredentials: _options.SigningCredentials);
            var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);

            var response = new
            {
                access_token = encodedJwt,
                //session_id = sessionId,
                expired = now.Add(_options.Expiration).Ticks,
                username= username.ToString()
            };

            // Serialize and return the response
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonConvert.SerializeObject(response, _serializerSettings));
        }

        private async Task GenerateToken(HttpContext context)
        {
            var username = context.Request.Form["userName"];
            var password = context.Request.Form["password"];
            var returnUrl = context.Request.Form["returnUrl"];
            var identity = await _options.IdentityResolver(context, username, password);

            if (identity == null)
            {
                context.Response.StatusCode = 400;
                //context.Response.
                //context.Response.
                await context.Response.WriteAsync("Invalid_username_or_password");
                return;
            }

            var now = DateTime.UtcNow;

            //http://www.jerriepelser.com/blog/aspnetcore-jwt-saving-bearer-token-as-claim/
            //增加access_token方便controller访问它
            identity.AddClaims(new Claim[]
                {
          new Claim(JwtRegisteredClaimNames.Sub, username),
          new Claim(JwtRegisteredClaimNames.Jti, await _options.NonceGenerator()),
          new Claim(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUniversalTime().ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                });
            //IIDentityTransaction it = context.RequestServices.GetService<IIDentityTransaction>();
            // var userRoles = await it.GetRoleClaim(username);
            //claims.AddRange(userRoles);
            // Create the JWT and write it to a string
            var jwt = new JwtSecurityToken(
                issuer: _options.Issuer,

                audience: _options.Audience,
                claims: identity.Claims,
                notBefore: now,
                expires: now.Add(_options.Expiration),
                signingCredentials: _options.SigningCredentials);
            var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);



            IIDentityTransaction it = context.RequestServices.GetService<IIDentityTransaction>();


            it.AuthenticateSessionHandle(encodedJwt, returnUrl);

            var response = new
            {
                access_token = encodedJwt,
                //session_id = sessionId,
                expired = now.Add(_options.Expiration).Ticks
            };

            // Serialize and return the response
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonConvert.SerializeObject(response, _serializerSettings));
        }

        private static void ThrowIfInvalidOptions(TokenProviderOptions options)
        {
            if (string.IsNullOrEmpty(options.Path))
            {
                throw new ArgumentNullException(nameof(TokenProviderOptions.Path));
            }

            if (string.IsNullOrEmpty(options.Issuer))
            {
                throw new ArgumentNullException(nameof(TokenProviderOptions.Issuer));
            }

            if (string.IsNullOrEmpty(options.Audience))
            {
                throw new ArgumentNullException(nameof(TokenProviderOptions.Audience));
            }

            if (options.Expiration == TimeSpan.Zero)
            {
                throw new ArgumentException("Must be a non-zero TimeSpan.", nameof(TokenProviderOptions.Expiration));
            }

            if (options.IdentityResolver == null)
            {
                throw new ArgumentNullException(nameof(TokenProviderOptions.IdentityResolver));
            }

            if (options.SigningCredentials == null)
            {
                throw new ArgumentNullException(nameof(TokenProviderOptions.SigningCredentials));
            }

            if (options.NonceGenerator == null)
            {
                throw new ArgumentNullException(nameof(TokenProviderOptions.NonceGenerator));
            }
        }

    }
}