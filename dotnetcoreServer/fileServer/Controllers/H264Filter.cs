using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FileServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
namespace FileServer.Controllers
{
    public class H264Model
    {
        public bool Result { get; set; }
    }
    public class H264Filter : ActionFilterAttribute
    {

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            var fileController = context.Controller as ServerController;
            var logger = fileController.logger;
            var jsonResult = context.Result as JsonResult;

            if (!(jsonResult.Value is VideoFileResultModel))
            {
                return;
            }
            var result = jsonResult.Value as VideoFileResultModel;
            logger.LogInformation("H264Filter->" + result.TmpUrl);
            if (string.IsNullOrEmpty(result.TmpUrl))
            {
                return;
            }
            var url = AppInstance.Instance.Config.FFMpegServer + "/h264?url=" + result.TmpUrl;
            var task = Task.Run(async () =>
            {
                HttpClient client = new HttpClient();
                await using Stream stream =
                await client.GetStreamAsync(url);
                var h264Result =
                    await JsonSerializer.DeserializeAsync<H264Model>(stream);
                result.EncodeRequired = h264Result.Result;

                if (result.EncodeRequired)
                {
                    result.TaskPercentRequestUrl = AppInstance.Instance.Config.FFMpegServer + "/dataProgress?url=" + result.TmpPath;
                }

                logger.LogInformation("H264Filter ... EncodeRequired->" + h264Result.Result);
            });
            task.Wait();
        }


    }
}