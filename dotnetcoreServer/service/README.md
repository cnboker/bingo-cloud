### reset databse for test

* remove all files from migrations folder
* dotnet ef database drop -f -v
* dotnet ef migrations add Initial
* dotnet ef database update

### docker mysql

```bash
#-v volume d:/data是本地目录, /var/lib/mysql 是容器默认目录
docker run  --name=mysql -p 3306:3306 --network=myNetwork --restart=always -v /home/ubuntu/data/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=ROO#2022 -d mysql/mysql-server 
docker exec -it mysql bash
docker ps
# list all container
docker ps -a
```

- 获取mysql docker ip

``` bash
sudo docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mysql
```

- 清除docker container 日志

```bash
#clear docker container logs
 sudo truncate -s 0 $(sudo docker inspect --format='{{.LogPath}}' authapi)
 sudo truncate -s 0 $(sudo docker inspect --format='{{.LogPath}}' serviceapi)
 sudo truncate -s 0 $(sudo docker inspect --format='{{.LogPath}}' jsxbuild)
```

注明：appsettings.json连接字符串中数据库IP不需要设置mysql内部IP,因为该IP在重新启动服务器后会改变，数据库IP设置服务器host的IP就可以了

- mysql docker远程访问报Access denied for user 'root'@'localhost' (using password: YES)的解决办法

```bash
#从mysql容器获取my.cnf到host当期目录
sudo docker cp mysql:/etc/my.cnf .
sudo vi ./my.cnf
#跳过密码验证
cat <<EOF > ./my.cnf
skip-grant-tables
EOF
sudo docker cp ./my.cnf mysql:/etc
sudo docker restart mysql
#无密码登录mysql
sudo docker exec -it mysql mysql

```

重新授权并更新数据库密码

```sql
flush privileges;
update user set host='%' where user='root';
GRANT ALL ON *.* TO 'root'@'%';
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
flush privileges;
```

还原my.cnf, 打开my.cnf文件,注解"skip-grant-tables",还原my.cnf重新启动mysql容器

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