#!bin/bash
cd /home/ioliz
git reset --hard
git pull
#删除未被使用的资源
docker system prune -f
#delete old container

#rebuild
cd /home/ioliz/member
docker-compose build
cd /home/ioliz/fileServer
docker-compose build
cd /home/ioliz/service
docker-compose build
cd /home/ioliz/jsxBuildServer
docker-compose build
#cd /home/ioliz//ffmpegServer
#docker-compose build
cd /home/ioliz/reverseProxy
docker-compose down
docker-compose build
docker-compose up -d