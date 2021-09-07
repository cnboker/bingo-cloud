using System;
using System.IO;
using Microsoft.AspNetCore.Hosting;

namespace Ioliz.Service.Providers
{
    public interface IPathProvider
    {
        string MapPath(string path);
    }

    public class PathProvider : IPathProvider
    {
        private IWebHostEnvironment _hostingEnvironment;

        public PathProvider(IWebHostEnvironment environment)
        {
            _hostingEnvironment = environment;
        }

        public string MapPath(string path)
        {
            var filePath = Path.Combine(_hostingEnvironment.WebRootPath, path);
            return filePath;
        }
    }
}