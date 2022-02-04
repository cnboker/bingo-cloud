using System;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;

namespace Ioliz.Shared.Middlewares {
  public class ErrorHandingMiddleware{

    private readonly RequestDelegate next;

    public ErrorHandingMiddleware(RequestDelegate next){
        this.next = next;
    }


    public async Task Invoke(HttpContext context){
      try{
        await next(context);
      }catch(Exception ex){
        await HandleExceptionAsync(context,ex);
      }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
      var code = HttpStatusCode.InternalServerError;
      //if(ex is MyNotFoundException) code = HttpStatusCode.NotFound

      var result = JsonConvert.SerializeObject(new {error = ex.Message});
      context.Response.ContentType = "application/json";
      context.Response.StatusCode = (int)code;
      return context.Response.WriteAsync(result);
    }
  }
}