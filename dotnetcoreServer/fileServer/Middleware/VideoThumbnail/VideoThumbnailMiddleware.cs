using FFmpeg.NET;
using FileServer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using System;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace ImageThumbnail.AspNetCore.Middleware
{
    /// <summary>
    /// test url:http://localhost:5000/admin/sample-30s.mp4?type=video&size=512x512&user=admin
    /// </summary>
    public class VideoThumbnailMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ImageThumbnailOptions _options;

        public VideoThumbnailMiddleware(RequestDelegate next, ImageThumbnailOptions options)
        {
            _next = next;
            _options = options;
            CreateThumbnailCacheDir();
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var isVideoValid = context.Request.Query["type"] == "video";


            if (isVideoValid)
            {
                var VideoThumbnailRequest = ParseRequest(context.Request);

                if (IsSourceVideoExists(VideoThumbnailRequest))
                {
                    if (!IsThumbnailExists(VideoThumbnailRequest))
                    {
                        await GenerateThumbnail(VideoThumbnailRequest, context.Response.Body);
                    }
                    if (File.Exists(VideoThumbnailRequest.ThumbnailSavePath))
                    {
                        await WriteFromCache(VideoThumbnailRequest.ThumbnailSavePath, context.Response.Body);
                    }else{
                        //显示默认图片
                        string defaultImage = GenerateThumbnailFilePath("video.jpeg");
                        Console.WriteLine("defaultImagePath=" + defaultImage);
                        await WriteFromCache(defaultImage, context.Response.Body);
                    }
                    // else
                    // {
                    //     await _next(context);
                    // }

                }
                else
                {
                    await _next(context);
                }
            }
            else
            {
                // Call the next delegate/middleware in the pipeline
                await _next(context);

            }
        }

        /// <summary>
        /// Parse request details from relative path
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        private VideoThumbnailRequest ParseRequest(HttpRequest request)
        {
            var req = new VideoThumbnailRequest();
            req.VideoSavePath = GetPhysicalPath(request.Path);
            string hostUrl = request.Scheme + "://" + request.Host;
            req.SourcePath = hostUrl + request.Path + "?size=" + request.Query["size"];
            string fileName = GetThumbnailFileName(request.Path, request.Query["user"]);
            req.ThumbnailSavePath = GenerateThumbnailFilePath(fileName);

            return req;
        }

        /// <summary>
        /// Generates thumbnail image, cache and write to output stream
        /// </summary>
        /// <param name="request"></param>
        /// <param name="stream"></param>
        /// <returns></returns>
        private async Task GenerateThumbnail(VideoThumbnailRequest request, Stream stream)
        {
            //create thumb
            var url = AppInstance.Instance.Config.FFMpegServer + "/image?url=" + request.SourcePath;
            Console.WriteLine("VideoThumbnailRequest source url=" + url);
            Console.WriteLine("VideoThumbnailRequest videosavepath =" + request.VideoSavePath);
            Console.WriteLine("VideoThumbnailRequest ThumbnailImagePath save path =" + request.ThumbnailSavePath);
            using (HttpClient client = new HttpClient())
            {
                try
                {
                    var response = await client.GetAsync(url);
                    //// Throw if not a success code.
                    response.EnsureSuccessStatusCode();
                    using (var fs = new FileStream(request.ThumbnailSavePath, FileMode.CreateNew))
                    {
                        await response.Content.CopyToAsync(fs);
                    };
                }
                catch (Exception e)
                {

                }

            };

        }


        private bool IsSourceVideoExists(VideoThumbnailRequest request)
        {
            if (File.Exists(request.VideoSavePath))
            {
                return true;
            }

            return false;
        }
        private bool IsThumbnailExists(VideoThumbnailRequest request)
        {
            if (File.Exists(request.ThumbnailSavePath))
            {
                return true;
            }

            return false;
        }

        private string GetPhysicalPath(string path)
        {
            var provider = new PhysicalFileProvider(Directory.GetCurrentDirectory() + "/wwwroot");
            var fileInfo = provider.GetFileInfo(path);

            return fileInfo.PhysicalPath;
        }

        private string GetThumbnailFileName(string path, string userName)
        {
            var fileName = Path.GetFileNameWithoutExtension(path);
            fileName = string.Format("{0}_{1}_v.jpeg", fileName, userName);
            return fileName;
        }
        private string GenerateThumbnailFilePath(string fileName)
        {
            // var fileName = Path.GetFileNameWithoutExtension(path);
            // var ext = Path.GetExtension(path);
            var provider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), _options.ImagesDirectory, _options.CacheDirectoryName));
            var fileInfo = provider.GetFileInfo(fileName);
            return fileInfo.PhysicalPath;
        }
        private void CreateThumbnailCacheDir()
        {
            if (!string.IsNullOrEmpty(_options.CacheDirectoryName))
            {
                Directory.CreateDirectory(Path.Combine(Directory.GetCurrentDirectory(), _options.ImagesDirectory, _options.CacheDirectoryName));
            }
        }

        private async Task WriteFromCache(string thumbnailPath, Stream stream)
        {
            using (var fs = new FileStream(thumbnailPath, FileMode.Open))
            {
                await fs.CopyToAsync(stream);
            }
        }


        private async Task WriteFromSource(VideoThumbnailRequest request, Stream stream)
        {
            using (var fs = new FileStream(request.ThumbnailSavePath, FileMode.Open))
            {
                await fs.CopyToAsync(stream);
            }
        }
    }
}