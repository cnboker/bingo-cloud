#!bin/bash
cd /home/ioliz
git reset --hard
git pull
#删除未被使用的资源
docker system prune -f
#delete old container
docker stop verseproxy_authapi_1
docker stop verseproxy_fileapi_1
docker stop verseproxy_serviceapi_1
#rebuild
cd /home/ioliz/member
docker-compose build
cd /home/ioliz/fileServer
docker-compose build
cd /home/ioliz/service
docker-compose build
cd /home/ioliz/jsxBuildServer
docker-compose build
cd /home/ioliz/reverseProxy
docker stop reverseproxy_reverseproxy_1
docker-compose up