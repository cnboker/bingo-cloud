### reset databse for test

* remove all files from migrations folder
* dotnet ef database drop -f -v
* dotnet ef migrations add Initial
* dotnet ef database update

### 关于环控设备分配过程的整个思路梳理

* 早期的设备分配是基于tbl_message的User字段， 目前因为增加了3级分配功能，所有增加了新表sensorScopes实现，作废tbl_message中的user功能，为了实现tbl_message数据的用户过滤功能现在通过视图sensorMessageView完成
sensorScope中的factory作为工厂账户字段， userName作为客户字段

### 关于环控设备分配数据迁移过程思路整理

* sensorScopes中factory字段设置成ibrights，同时将tbl_message中User字段数据迁移到sensorScopes中的Username字段

* 升级脚本

```tsql
declare @factory  nvarchar(200)
set @factory='szsong100'
insert into SensorScopes(SensorId,UserName,Factory)
select replace(topic,'SENSORS/',''), messageUserName,'szsong100' from [dbo].[sensorMessageView] 
where messageUserName is not null and topic like 'SENSORS/%'
```

### 关于设备分组，设备型号，设备名称数据绑定的思路梳理

* 目前fanModel的数据内容包括deviceId(数字标牌ID)，name(环控名称),model(环控型号),sensorId
* 环控设备绑定数字标牌设置做了2个步骤， 第一是调用/api/device/addOrUpdateSenser接口， 将name添加到devices表， 第二调用/api/sensor/update接口，将fanModel的所有信息重新做保存；
* 以上的操作方面有2个缺点：fanModel数据是以json的格式保存，数据展示不方便， 另外就是如果同时2个人修改数据会导致先后覆盖
* 为了解决以上问题：
  * 现将fanModel的数据以数据表格的形式保存,表名称为SensorModel
  * 在调用/api/sensor/settings/v2/user1,返回fanModel数据结构保持不变，调用/api/sensor/update只提交更新数据，不提交全部数据;
  
  * sensorScopes移除model, name,group字段， sensorMessageView增加fanModel表格级联，把fanmodel中的name, model加入视图;
  

### 关于电能统计思路整理

* 假设一个传感器A在10:30 上传一次数据读表数据是0.15, 10:31上传数据读表0.151, 以此类推，表格数据为:

|  时间   | 电能消耗  | 差额 |
|  ----  | ----  | --- |
| 10:30  | 0.15 | 0 |
| 10:31  | 0.151 | 0.01 |
| 10:32  | 0.152 | 0.01 |

* 为了计算一台设备没小时的电能， 先将表格当前时间电能-上一次提交电能=差额， 然后通过group by hour 进行合计

* 统计数据T-SQL

```tsql
select *
from
(
  Select s.*,
    row_number() over(order by createdate ) rn
  from 
  (select value, createdate,
       value - coalesce(lag(value) over (order by createdate), 0) as diff
from [Power.Minutes]) as s
) src
where rn >1
```

![](image/readme/1623830911091.png)


### 服务器运行环境配置

* 安装vc_redist.x64.exe
* 安装mosquitto-1.6.9-install-windows-x64.exe,配置mos.conf文件
* 安装dotnet-hosting-3.1.16-win.exe
* 重新启动iis
    * ```powershell
        net stop was /y
        net start w3svc
        ```
* 测试配置是否正常， 在浏览器打开 "/api/test/hello" 如果能正常运行，说明配置ok
* 接着配置app, Ioliz.idnetity

### 升级数据库
   * 升级Ioliz.idenitty数据库

```sql
USE [member]
GO

ALTER TABLE [dbo].[AspNetUsers] ADD 
[CreateDate] [datetime] NULL
GO
```

  * 升级service数据库
```sql
USE [service]
GO

ALTER TABLE [dbo].[MailMessage] DROP COLUMN [Email]
GO
ALTER TABLE [dbo].[MailMessage] ADD 
[EmailAddress] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL,
[TemplateId] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
[Parameter1] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
[Parameter2] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
[Parameter3] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
[Parameter4] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL
GO
ALTER TABLE [dbo].[SensorConfigs] ADD 
[SensorPropsLabelData] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL
GO
CREATE TABLE [dbo].[SensorScopeDetails]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[HandleStep] [int] NOT NULL,
	[ParentId] [int] NOT NULL,
	[Remark] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[UserName] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	CONSTRAINT [PK_SensorScopeDetails] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[SensorModels]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[DeviceId] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL,
	[UserName] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL,
	[SensorId] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL,
	[Name] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL,
	[Model] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL,
	CONSTRAINT [PK_SensorModel] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[SensorScopes]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[SensorId] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Factory] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[HandleMethod] [int] NULL,
	[HandleStep] [int] NULL,
	[NetworkState] [int] NULL,
	[State] [int] NULL,
	[UpdateTime] [datetime] NULL,
	[UserName] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[ApplyTime] [datetime] NULL,
	CONSTRAINT [PK_SensorScopes] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[SIMInfos]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[CustomerName] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[ICCID] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[IsBinding] [bit] NOT NULL,
	[Name] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Number] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[PayMonth] [int] NOT NULL,
	[Price] [decimal] (18,2) NOT NULL,
	[Total] [decimal] (18,2) NOT NULL,
	[UploadDate] [datetime2] NOT NULL,
	CONSTRAINT [PK_SIMInfos] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[RepairApplies]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[AcceptDate] [datetime2] NULL,
	[Accepter] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[ApplyDate] [datetime2] NOT NULL,
	[ApplyState] [int] NOT NULL,
	[Applyer] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Desc] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[FaultPoint] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Images] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[LastRemenderTime] [datetime2] NULL,
	[Title] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[RemenderCount] [int] NULL,
	[SensorId] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Name] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[FactoryFinisheddDate] [datetime2] NULL CONSTRAINT [DF__RepairApp__Facto__0A9D95DB] DEFAULT ('0001-01-01T00:00:00.000'),
	[FinishedDate] [datetime2] NULL CONSTRAINT [DF__RepairApp__Finis__0B91BA14] DEFAULT ('0001-01-01T00:00:00.000'),
	[HandleMethod] [int] NOT NULL CONSTRAINT [DF__RepairApp__Handl__0C85DE4D] DEFAULT ((0)),
	CONSTRAINT [PK_RepairApplies] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[PreOrders]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[Address] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Amount] [decimal] (18,2) NOT NULL,
	[CreateDate] [datetime2] NOT NULL,
	[IsPaid] [bit] NOT NULL,
	[Mobile] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[Name] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[OrderNo] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[PaidDate] [datetime2] NOT NULL,
	[Remark] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	CONSTRAINT [PK_PreOrders] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE VIEW [dbo].[sensorFaultApplyView]
AS
SELECT  dbo.RepairApplies.AcceptDate, dbo.RepairApplies.Accepter, dbo.RepairApplies.ApplyDate, dbo.RepairApplies.ApplyState, dbo.RepairApplies.Applyer, 
               dbo.RepairApplies.[Desc], dbo.RepairApplies.FaultPoint, dbo.RepairApplies.Images, dbo.RepairApplies.LastRemenderTime, dbo.RepairApplies.Title, 
               dbo.RepairApplies.RemenderCount, dbo.RepairApplies.FinishedDate, dbo.RepairApplies.HandleMethod, mqttBroker.dbo.tbl_messages.message, 
               mqttBroker.dbo.tbl_messages.createDate, mqttBroker.dbo.tbl_messages.status, dbo.RepairApplies.SensorId, dbo.RepairApplies.Name, 
               dbo.RepairApplies.Id, dbo.RepairApplies.FactoryFinisheddDate
FROM     mqttBroker.dbo.tbl_messages INNER JOIN
               dbo.RepairApplies ON mqttBroker.dbo.tbl_messages.topic = 'SENSORS/' + dbo.RepairApplies.SensorId
GO
CREATE VIEW [dbo].[SensorScopeModelView]
AS
SELECT  dbo.SensorModels.Name, dbo.SensorModels.Model, dbo.SensorScopes.UserName, dbo.SensorScopes.SensorId, dbo.SensorScopes.UpdateTime, 
               dbo.SensorScopes.State, dbo.SensorScopes.NetworkState, dbo.SensorScopes.Factory, dbo.SensorScopes.HandleMethod, 
               dbo.SensorScopes.HandleStep, dbo.SensorScopes.Id, dbo.SensorScopes.ApplyTime
FROM     dbo.SensorModels INNER JOIN
               dbo.SensorScopes ON dbo.SensorModels.SensorId = dbo.SensorScopes.SensorId
GO
CREATE VIEW [dbo].[sensorMessageView]
AS
SELECT  mqttBroker.dbo.tbl_messages.message, mqttBroker.dbo.tbl_messages.topic, mqttBroker.dbo.tbl_messages.sim, dbo.SensorScopeModelView.Name, 
               dbo.SensorScopeModelView.Model, dbo.SensorScopeModelView.UserName, dbo.SensorScopeModelView.SensorId, 
               dbo.SensorScopeModelView.UpdateTime, dbo.SensorScopeModelView.State, dbo.SensorScopeModelView.NetworkState, 
               dbo.SensorScopeModelView.Factory, dbo.SensorScopeModelView.HandleMethod, dbo.SensorScopeModelView.HandleStep, 
               dbo.SensorScopeModelView.Id, mqttBroker.dbo.tbl_messages.messageID
FROM     mqttBroker.dbo.tbl_messages LEFT OUTER JOIN
               dbo.SensorScopeModelView ON mqttBroker.dbo.tbl_messages.topic = 'SENSORS/' + dbo.SensorScopeModelView.SensorId
GO
```

 * 更新数据库mqttwacther

```SQL
USE [mqttBroker]
GO


ALTER TABLE [dbo].[tbl_messages] ADD 
[sim] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL
GO
ALTER TABLE [dbo].[tbl_messages] ALTER COLUMN [topic] [varchar] (50) COLLATE Chinese_PRC_CI_AS NOT NULL
GO
CREATE TABLE [dbo].[Power.Hours]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[SensorId] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[Value] [decimal] (18,4) NULL,
	[CreateDate] [datetime] NULL,
	CONSTRAINT [PK_Power.Hours] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Power.Days]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[SensorId] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[Value] [decimal] (18,4) NULL,
	[CreateDate] [date] NULL,
	CONSTRAINT [PK_Power.Days] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[SensorState.Days]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[UserName] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[OnlineCount] [int] NULL,
	[OfflineCount] [int] NULL,
	[CreateDate] [datetime] NULL,
	CONSTRAINT [PK_SensorState.Days] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_SensorState.Days] ON [dbo].[SensorState.Days]
(
	[UserName] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO

CREATE NONCLUSTERED INDEX [IX_SensorState.Days_1] ON [dbo].[SensorState.Days]
(
	[CreateDate] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO


CREATE TABLE [dbo].[SensorState.Hours]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[UserName] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[OnlineCount] [int] NULL,
	[OfflineCount] [int] NULL,
	[CreateDate] [datetime] NULL,
	CONSTRAINT [PK_SensorState.Hours] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_SensorState.Hours] ON [dbo].[SensorState.Hours]
(
	[CreateDate] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO


CREATE TABLE [dbo].[SensorWorkTimes]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[SensorId] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[Duration] [int] NULL,
	[CreateDate] [date] NULL,
	CONSTRAINT [PK_SensorWorkTimes] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[Message.Hours]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[SensorId] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[Message] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[MessageDate] [datetime] NULL,
	[CreateDate] [datetime] NULL,
	CONSTRAINT [PK_Message.Hours] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Message.Hours] ON [dbo].[Message.Hours]
(
	[SensorId] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO

CREATE NONCLUSTERED INDEX [IX_Message.Hours_1] ON [dbo].[Message.Hours]
(
	[CreateDate] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO


CREATE TABLE [dbo].[Message.Days]
(
	[Id] [int] IDENTITY (1,1) NOT NULL,
	[SensorId] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL,
	[Message] [nvarchar] (max) COLLATE Chinese_PRC_CI_AS NULL,
	[MessageDate] [datetime] NULL,
	[CreateDate] [datetime] NULL,
	CONSTRAINT [PK_Message.Days] PRIMARY KEY CLUSTERED
	(
		[Id] ASC
	) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Message.Days] ON [dbo].[Message.Days]
(
	[CreateDate] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO

CREATE NONCLUSTERED INDEX [IX_Message.Days_1] ON [dbo].[Message.Days]
(
	[SensorId] ASC
) WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY  = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO



-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
create PROCEDURE [dbo].[power_minute_to_hour_by_sensor]
	-- Add the parameters for the stored procedure here
	@sensorId nvarchar(50),
	@start datetime,
	@end datetime
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    select 
	@sensorId as 'sensorId',
LTRIM(str(DATEPART(YEAR, [createdate]))) + '-' +  
LTRIM(str(DATEPART(MONTH, [createdate])))  + '-' + 
LTRIM( str(DATEPART(DAY, [createdate]))) + ' ' + 
LTRIM(str(DATEPART(HOUR, [createdate]))) + ':00' as 'date', 
sum(diff) as 'sumary' from 
(select *
from
(
  Select s.*,
    row_number() over(order by createdate ) rn
  from 
  (select sensorId, value, createdate,
       value - coalesce(lag(value) over (order by sensorId,createdate), 0) as diff
	from [Power.Minutes]
	--group by sensorId,value,createdate
	where sensorId=@sensorId and (createdate between @start and @end)
) as s
) src
where rn >1) as t

group by DATEPART(YEAR, [createdate]),
DATEPART(MONTH, [createdate]),
DATEPART(DAY, [createdate]),
DATEPART(HOUR, [createdate])

END
GO
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[calc_power_by_hours]
	
AS
BEGIN
	declare @start datetime
declare @end datetime
set @start = convert(varchar(10), getdate(), 120)
set @end = getdate()

declare @mycursor as cursor
declare @sensorId as nvarchar(50)
set @mycursor =cursor for 
select sensorId from [power.minutes]
group by sensorId
--删除当天数据，重新更新
delete from [power.hours] where createdate between @start and @end
open @mycursor;
fetch next from @mycursor into @sensorId

while @@FETCH_STATUS = 0
begin
	print @sensorId
	insert into [power.hours] (sensorId,createdate,value)
	exec power_minute_to_hour_by_sensor @sensorId, @start, @end
	fetch next from @mycursor into @sensorId
end

close @mycursor
deallocate @mycursor

END
GO
```

