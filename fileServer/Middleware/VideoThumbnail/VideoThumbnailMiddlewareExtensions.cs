using Microsoft.AspNetCore.Builder;
using System;
using System.Collections.Generic;
using System.Text;

namespace ImageThumbnail.AspNetCore.Middleware
{
    public static class VideoThumbnailMiddlewareExtensions
    {
        public static IApplicationBuilder UseVideoThumbnail(
            this IApplicationBuilder builder,ImageThumbnailOptions options)
        {
            return builder.UseMiddleware<VideoThumbnailMiddleware>(options);
        }
    }
}