
-- ��ȡ���յ���
declare @start datetime
declare @end datetime
set @start = cast(getdate() as date)
set @end = getdate()
select datepart(HOUR,createdate) as hour, sum(value) as value from [power.hours]
where createdate between @start and @end
group by  createdate

-- ��ȡ�����õ���
select day(createDate) as day,sum(value) as value from [power.days] where Year(createdate) = Year(CURRENT_TIMESTAMP) and Month(createDate) = Month(CURRENT_TIMESTAMP)
group by Day(createDate)

-- ��ȡ�����õ���
SELECT day(createDate) as day,sum(value) as value
FROM [power.days]
WHERE DATEPART(m, createDate) = DATEPART(m, DATEADD(m, -1, getdate()))
AND DATEPART(yyyy, createDate) = DATEPART(yyyy, DATEADD(m, -1, getdate()))
group by Day(createDate)

--��ȡ�����õ���
select month(createDate) as month,sum(value) as value from [power.days] where Year(createdate) = Year(CURRENT_TIMESTAMP) 
group by month(createDate)
--��ȡȥ���õ���
select month(createDate) as month,sum(value) as value from [power.days] where Year(createdate) = Year(CURRENT_TIMESTAMP) -1
group by month(createDate)