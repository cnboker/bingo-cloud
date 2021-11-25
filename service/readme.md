### reset databse for test

* remove all files from migrations folder
* dotnet ef database drop -f -v
* dotnet ef migrations add Initial
* dotnet ef database update

### docker mysql

```bash
docker run -p 3306:3306 -d --name mysql -e MYSQL_ROOT_PASSWORD=1 mysql/mysql-server
docker exec -it mysql bash
docker ps
```

更新账号客户端才可以正常连接

```sql
--update passowrd_policy
SHOW VARIABLES LIKE 'validate_password%';
SET GLOBAL validate_password.length = 6;
SET GLOBAL validate_password.number_count = 0;

update user set host='%' where user='root'
alter user 'root' identified with mysql_native_password by '1';
flush privileges;
```
