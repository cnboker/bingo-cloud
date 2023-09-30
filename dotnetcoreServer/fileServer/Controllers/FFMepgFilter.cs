using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using FileServer.Models;
using System.Net.Http;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
namespace FileServer.Controllers
{
    //检查是否是视频文件
    //如果是视频文件，则做重新编码操作，将重新编码后的文件返回给浏览器
    public class FFMepgFilter : ActionFilterAttribute
    {
        // void IActionFilter.

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            var fileController = context.Controller as ServerController;
            var backgroundWorkQuenue = fileController.backgroundWorkQuenue;
            var logger = fileController.logger;
            var jsonResult = context.Result as JsonResult;

            if (!(jsonResult.Value is VideoFileResultModel))
            {
                return;
            }
            var result = (VideoFileResultModel)jsonResult.Value;
            logger.LogInformation("ffmepgfilter->EncodeRequired->" + result.EncodeRequired);
            if (!result.EncodeRequired)
            {
                //不需要编码则将临时文件视频移动到用户选择的当前目录则SavePath
                File.Move(result.TmpPath, result.SavePath);
                return;
            }

            if (string.IsNullOrEmpty(result.TmpUrl))
            {
                return;
            }
            //encode video
            var url = AppInstance.Instance.Config.FFMpegServer + "?url=" + result.TmpUrl;
            logger.LogInformation("ffmepgfilter->savepath->" + result.SavePath);
            logger.LogInformation("ffmepgfilter->download url->" + url);
         
            backgroundWorkQuenue.QueueBackgroundWorkItem(async token =>
            {
                using (HttpClient client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(60);
                    try
                    {
                        var response = await client.GetAsync(url);
                        using (var fs = new FileStream(result.SavePath, FileMode.CreateNew))
                        {
                            await response.Content.CopyToAsync(fs);
                        };
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("FFMepgFilter ERROR->" + ex.Message);
                    }
                    finally
                    {
                        try
                        {
                            File.Delete(result.TmpPath);
                        }
                        catch { }

                    }

                };
            });
        }

        private async Task<T> GetPercent<T>(HttpClient client, string url)
        {
            var streamTask = client.GetStreamAsync(url);
            return await JsonSerializer.DeserializeAsync<T>(await streamTask);
        }

    }

    public class MpegRequestToken
    {
        public string Key { get; set; }
    }

    public class MpegPercentInfo
    {
        //total processed frame count
        public int Frames { get; set; }
        //framerate at which FFmpeg is currently processing
        public decimal CurrentFps { get; set; }
        //throughput at which FFmpeg is currently processing
        public decimal CurrentKbps { get; set; }
        //current size of the target file in kilobytes
        public decimal TargetSize { get; set; }
        //an estimation of the progress percentage
        public decimal Percent { get; set; }
        //编码完成下载链接
        public string DownloadUrl { get; set; }
    }
}
