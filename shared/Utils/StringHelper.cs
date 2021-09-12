using System;
using System.Net;
using System.Threading;

namespace Ioliz.Shared.Utils
{

  public static class StringHelper
  {

    public static string GetOrdersNo()
    {
      Thread.Sleep(5);
      return DateTime.Now.ToString("yyMMddHHmmss") + (new Random()).Next(100, 10000);
    }

    public static string GetRandom(int len)
    {
      Thread.Sleep(1);
      long tick = DateTime.Now.Ticks; ;
      Random ran = new Random((int)(tick & 0xffffffffL) | (int)(tick >> 32));
      string chars = "abcdefghigklmnopqrstuvwxyz0123456789";
      string str = "";
      for (int i = 0; i < len; i++)
      {
        str += chars[ran.Next(0, chars.Length)].ToString();
      }
      return str;
    }

    static public string ToStringIP(int intAddress)
    {
      return new IPAddress(BitConverter.GetBytes(intAddress)).ToString();
    }

    static public int ToIntIP(string address)
    {
      return BitConverter.ToInt32(IPAddress.Parse(address).GetAddressBytes(), 0);
    }

  }
}