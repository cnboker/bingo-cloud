using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using FileServer.Models;
using System.Net.Http;
using System.IO;

namespace FileServer.Controllers
{
    //检查是否是视频文件
    //如果是视频文件，则做重新编码操作，将重新编码后的文件返回给浏览器
    public class FFMepgFilter : ActionFilterAttribute, IActionFilter
    {
        // void IActionFilter.

        public override async void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            var jsonResult = context.Result as JsonResult;
            var result = (FileResultModel)jsonResult.Value;
            if (string.IsNullOrEmpty(result.FullUrl))
            {
                return;
            }

            var url = AppInstance.Instance.Config.FFMpegServer + "?url=" + result.FullUrl;
            Console.WriteLine("fullUrl=" + result.FullUrl);
            Console.WriteLine("savePath=" + result.SavePath);
            if (File.Exists(result.SavePath)) return;
            using (HttpClient client = new HttpClient())
            {
                var response = await client.GetAsync(url);
                using (var fs = new FileStream(result.SavePath, FileMode.CreateNew))
                {
                    await response.Content.CopyToAsync(fs);
                };
            };

        }

    }
}