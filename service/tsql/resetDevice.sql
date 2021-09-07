--删除设备，释放许可
declare @deviceId nvarchar(200)
set @deviceId = 'E8B1FC081DDF54EE752C6B94E8B1FC081DE0EAB1FC081DE02601205241539E4620524153A06520524153E8B1FC081DE30A0027000004EAB1FC081DDF'
update Licenses
 set
  DeviceId=null,
  ActivationdDate =null,
  ApiUrl = null,
  Status = 0
  where id in(select CurrentLicenseId from Devices where DeviceId=@deviceId)
delete from Devices where DeviceId=@deviceId
