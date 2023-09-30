using Xunit;
using System;
using System.IO;
using FileServer;
namespace Ioliz.Server.Tests;

public class ImageUtilTest
{

    [Fact]
    public void ResizeImage()
    {
        var testRootDir = Directory.GetParent(Directory.GetParent(Directory.GetParent(Directory.GetCurrentDirectory()).FullName??"").FullName??"").FullName??"";
        var rootDir = Path.Combine(testRootDir, "fileServer", "images");
        Console.WriteLine("testDir=" + rootDir);
        var imagePath = Path.Combine(rootDir, "girl.jpg");
         var imagePath1 = Path.Combine(rootDir, "girl1.jpg");
        ImageUtil.Resize(imagePath,imagePath1);
        Assert.True(File.Exists(imagePath1));

    }
}