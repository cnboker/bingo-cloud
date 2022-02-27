using FFmpeg.NET;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using System;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace ImageThumbnail.AspNetCore.Middleware
{
    /// <summary>
    /// Middleware to serve image thumbnails
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
            var isVideoValid = !string.IsNullOrEmpty(context.Request.Query["size"]) &&
            context.Request.Query["type"] == "video";
            //Console.WriteLine("isValid=" + isValid.ToString());
            if (isVideoValid)
            {
                var thumbnailRequest = ParseRequest(context.Request);

                if (IsSourceImageExists(thumbnailRequest))
                {
                    // if (!thumbnailRequest.ThumbnailSize.HasValue)
                    // {
                    //     //Original image requested
                    //     await WriteFromSource(thumbnailRequest, context.Response.Body);
                    // }
                    // else if (IsThumbnailExists(thumbnailRequest) && thumbnailRequest.ThumbnailSize.HasValue)
                    // {
                    //     //Thumbnail already exists. Send it from cache.
                    //     await WriteFromCache(thumbnailRequest.ThumbnailImagePath, context.Response.Body);
                    // }
                    if (!IsThumbnailExists(thumbnailRequest))
                    {
                        await GenerateThumbnail(thumbnailRequest, context.Response.Body);
                    }

                    context.Response.ContentType = "text/plain";
                    context.Response.StatusCode = 200;
                    context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                    context.Response.Headers.Add("Access-Control-Allow-Credentials", "true");
                    context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-File-Name");
                    context.Response.Headers.Add("Access-Control-Allow-Methods", "POST,GET,PUT,PATCH,DELETE,OPTIONS");

                    await context.Response.WriteAsync(thumbnailRequest.ThumbnailImageUrl, CancellationToken.None);
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
        private ThumbnailRequest ParseRequest(HttpRequest request)
        {
            var req = new ThumbnailRequest();
            req.RequestedPath = request.Path;
            req.ThumbnailSize = ParseSize(request.Query["size"]);
            req.SourceImagePath = GetPhysicalPath(request.Path);
            string fileName = GetThumbnailFileName(request.Path, req.ThumbnailSize, request.Query["user"]);
            req.ThumbnailImagePath = GenerateThumbnailFilePath(fileName);
             string hostUrl = request.Scheme + "://" + request.Host;
            req.ThumbnailImageUrl = hostUrl + "/" + _options.CacheDirectoryName + "/" + fileName + "?size=128x128&type=image&user=" + request.Query["user"];;
            //req.UserName = request.Query["user"];
            Console.WriteLine("SourcevidoPath=" + req.SourceImagePath);
            Console.WriteLine("RequestedPath=" + req.RequestedPath);
            Console.WriteLine("ThumbnailVideoPath=" + req.ThumbnailImagePath);

            return req;
        }

        /// <summary>
        /// Generates thumbnail image, cache and write to output stream
        /// </summary>
        /// <param name="request"></param>
        /// <param name="stream"></param>
        /// <returns></returns>
        private async Task GenerateThumbnail(ThumbnailRequest request, Stream stream)
        {
            if (File.Exists(request.SourceImagePath))
            {
                var inputFile = new InputFile(request.SourceImagePath);
                var outputFile = new OutputFile(request.ThumbnailImagePath);
                var ffmpeg = new Engine("ffmpeg");
                // Saves the frame located on the 15th second of the video.
                var options = new ConversionOptions
                {
                    Seek = TimeSpan.FromSeconds(5),
                    CustomHeight = 256,
                    CustomWidth = 256
                };
                CancellationToken source1 = new CancellationToken();
                await ffmpeg.GetThumbnailAsync(inputFile, outputFile, options, source1);
            }
        }

        /// <summary>
        /// Parse input size string. Ex. sizes : 128x128, 120, 1, 512x512
        /// </summary>
        /// <param name="size"></param>
        /// <returns></returns>
        private Size? ParseSize(string size)
        {
            var _size = _options.DefaultSize.Value;

            try
            {
                if (!string.IsNullOrEmpty(size))
                {
                    size = size.ToLower();
                    if (size.Contains("x"))
                    {
                        var parts = size.Split('x');
                        _size.Width = int.Parse(parts[0]);
                        _size.Height = int.Parse(parts[1]);
                    }
                    else if (size == "full")
                    {
                        return new Nullable<Size>();
                    }
                    else
                    {
                        _size.Width = int.Parse(size);
                        _size.Height = int.Parse(size);
                    }
                }
            }
            catch (ArgumentException ex)
            {
                throw ex;
            }


            return _size;
        }

        private bool IsSourceImageExists(ThumbnailRequest request)
        {
            if (File.Exists(request.SourceImagePath))
            {
                return true;
            }

            return false;
        }
        private bool IsThumbnailExists(ThumbnailRequest request)
        {
            if (File.Exists(request.ThumbnailImagePath))
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

        private string GetThumbnailFileName(string path, Size? size, string userName){
            if (!size.HasValue)
                return path;
            var fileName = Path.GetFileNameWithoutExtension(path);
            var ext = Path.GetExtension(path);

            //ex : sample.jpg -> sample_256x256_mp4.jpeg
            fileName = string.Format("{0}_{1}x{2}_{3}_mp4.jpeg", fileName, size.Value.Width, size.Value.Height, userName);
            return fileName;
        }
        private string GenerateThumbnailFilePath(string fileName)
        {
            //string fileName = GetThumbnailFileName(path,size,userName);
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


        private async Task WriteFromSource(ThumbnailRequest request, Stream stream)
        {
            using (var fs = new FileStream(request.SourceImagePath, FileMode.Open))
            {
                await fs.CopyToAsync(stream);
            }
        }
    }
}