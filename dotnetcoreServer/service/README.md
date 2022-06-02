### reset databse for test

* remove all files from migrations folder
* dotnet ef database drop -f -v
* dotnet ef migrations add Initial
* dotnet ef database update

### docker mysql

```bash
#-v volume d:/data是本地目录, /var/lib/mysql 是容器默认目录
docker run --name=mysql -p 3306:3306 --network=myNetwork --restart=always -v /home/data/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=1 -d mysql/mysql-server 
docker exec -it mysql bash
docker ps
# list all container
docker ps -a
```
- 获取mysql docker ip

``` bash
 docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mysql
```
手动更新appsettings.json连接字符串


更新账号客户端才可以正常连接

```sql
--update passowrd_policy
--SHOW VARIABLES LIKE 'validate_password%';
--SET GLOBAL validate_password.length = 6;
--SET GLOBAL validate_password.number_count = 0;

update user set host='%' where user='root';
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '1';
--alter user 'root' identified with mysql_native_password by '1';
flush privileges;
```
## package dependency
2.0.9 runtime is required
https://dotnet.microsoft.com/en-us/download/dotnet/2.0
## wsl2 git push error
在bash下执行下面命令，使得wsl2下面的git命令采用host下的验证信息
```bash
git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/libexec/git-core/git-credential-manager.exe"
```

mysql update timezone

``` mysql
SET  time_zone = 'Asia/Shanghai';

```