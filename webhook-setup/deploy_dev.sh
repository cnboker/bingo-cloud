#!bin/bash
# Although Compose works in all environments, it's more focused
# development and testing. Using Compose on a production environment is not recommended at all.
#删除未被使用的资源
docker system prune -f
docker network create myNetwork
#rebuild
#docker-compose build
docker container stop authapi
docker container rm authapi
#~/src 为远程服务器目录
docker image build --tag authapi:latest --file ~/src/ioliz/dotnetcoreServer/member/Dockerfile . # ../:docker context
# docker container run \
#     --rm \ #自动删除旧的container
#     --detach \ #后台执行
#     --restart always \ #host 启动自动重启
#     --name authapi \ #名字
#     --publish 7800:7800 \ #端口map
#     --network myNetwork \ #bridge network
#     authapi:latest
docker run --detach --restart always --name authapi --publish 7800:7800 --network myNetwork authapi:latest

#docker-compose build
docker container stop fileapi
docker container rm fileapi
docker image build --tag fileapi:latest --file ~/src/ioliz/fileServer/Dockerfile .
docker run --detach --restart always --name fileapi --publish 5000:5000 --network myNetwork --volume ~/data/files:/release/wwwroot fileapi:latest

#docker-compose build
docker container stop serviceapi
docker container rm serviceapi
docker image build --tag serviceapi:latest --file ~/src/ioliz/dotnetcoreServer/service/Dockerfile .
docker run --detach --restart always --name serviceapi --publish 6001:6001 --network myNetwork serviceapi:latest


#docker-compose build
docker container stop jsxbuild
docker container rm jsxbuild
docker image build --tag jsxbuild:latest --file ~/src/ioliz/jsxBuildServer/Dockerfile .
docker run --detach --restart always --name  jsxbuild --publish 8888:8888 --network myNetwork jsxbuild:latest


#docker-compose build
docker container stop ffmpegapi
docker container rm ffmpegapi
docker image build --tag ffmpegapi:latest --file ~/src/ioliz/ffmpegServer/Dockerfile .
docker run --detach --restart always --name ffmpegapi --publish 9000:9000 --network myNetwork ffmpegapi:latest

#docker network create myNetwork
docker container stop nginxserver
docker container rm nginxserver
docker image build --tag nginxserver:latest --file ~/src/ioliz/reverseProxy/Dockerfile .
docker run --detach --restart always --name nginxserver --publish 80:80 --network myNetwork --volume ~/www/app:/app --volume /www/home:/www nginxserver:latest
