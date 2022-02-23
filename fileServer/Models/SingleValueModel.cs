using System.Collections.Generic;

namespace FileServer
{
  public class ValueModel<T>
  {
    public T Value { get; set; }
  }

  public class FileInfo {
     public bool IsDir {get;set;}
     public string Path {get;set;}
  }
}