using Xunit;
using System;
using System.Reflection;
using System.Collections.Generic;
using System.IO;
using Ioliz.Shared.Utils;

namespace Ioliz.Server.Tests;

public class WebDirectoryTest
{

    [Fact]
    public void Test1()
    {
        var domain = "http://file.dsliz.info";
        var testRootDir = Directory.GetParent(Directory.GetParent(Directory.GetParent(Directory.GetCurrentDirectory()).FullName??"").FullName??"").FullName??"";
        var rootDir = Path.Combine(testRootDir, "shared", "testData");
        Console.WriteLine("testDir=" + rootDir);
        var userDir = Path.Combine(rootDir, "scott");
        WebDirectory web = new WebDirectory(domain,"scott");
        web.CreateFileMap(userDir);
        string dumpData = ObjectDumper.Dump(web.fileMap.Values);
        Console.WriteLine("dumpData->" + dumpData);
        Assert.Equal(7, web.fileMap.Count);

    }
}