#!bin/bash
cd /home/ioliz
git reset --hard
git pull
#删除未被使用的资源
docker system prune -f
#delete old container

#rebuild
cd /home/ioliz/dotnetcoreServer/member
docker-compose build
cd /home/ioliz/dotnetcoreServer/fileServer
docker-compose build
cd /home/ioliz/dotnetcoreServer/service
docker-compose build
cd /home/ioliz/jsxBuildServer
docker-compose build
cd /home/ioliz/ffmpegServer
docker-compose build
cd /home/ioliz/reverseProxy
docker network create myNetwork
docker-compose down
docker-compose build
docker-compose up -d 

#fileServer 经常出现数据目录无法挂载的情况，出现这种问题，直接使用命令docker-compose up --force-recreate