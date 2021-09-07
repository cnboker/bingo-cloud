using System;
using System.Collections.Generic;
using System.ComponentModel;

namespace Ioliz.Shared.Utils
{

  static public class TypeConvertor
  {
    public static T Convert<T>(this string text)
    {
      try
      {
        var convertor = TypeDescriptor.GetConverter(typeof(T));
        if (convertor != null)
        {
          return (T)convertor.ConvertFromString(text);
        }
        return default(T);
      }
      catch (Exception)
      {
        return default(T);
      }

    }
  }
}