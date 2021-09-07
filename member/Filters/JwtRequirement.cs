using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace Member.Filters{
  public class JwtRequirement : AuthorizationHandler<JwtRequirement>, IAuthorizationRequirement
  {
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, JwtRequirement requirement)
    {
       return null;
    }
  }
}