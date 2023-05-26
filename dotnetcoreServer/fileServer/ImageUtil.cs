using System;
using System.IO;
using ImageMagick;

namespace FileServer
{
    public static class ImageUtil
    {

        static public void Resize(string filepath)
        {
            Resize(filepath,filepath);
        }
        static public void Resize(string filepath,string targetPath)
        {
            var maxImageDimension = 2048;
            if (File.Exists(filepath))
            {
                // Read from file
                using (var image = new MagickImage(filepath))
                {
                    if (image.Width > maxImageDimension || image.Height > maxImageDimension)
                    {
                        double ratioX = maxImageDimension / (double)image.Width;
                        double ratioY = maxImageDimension / (double)image.Height;
                        double ratio = ratioX < ratioY ? ratioX : ratioY;

                        int newHeight = Convert.ToInt32(image.Height * ratio);
                        int newWidth = Convert.ToInt32(image.Width * ratio);

                        int posX = Convert.ToInt32((maxImageDimension - (image.Width * ratio)) / 2);
                        int posY = Convert.ToInt32((maxImageDimension - (image.Height * ratio)) / 2);

                        var size = new MagickGeometry(posX, posY, newWidth, newHeight);
                        // This will resize the image to a fixed size without maintaining the aspect ratio.
                        // Normally an image will be resized to fit inside the specified size.
                        size.IgnoreAspectRatio = true;

                        image.Resize(size);

                        // Save the result
                        image.Write(targetPath);
                    }

                }
            }
        }

    }

}