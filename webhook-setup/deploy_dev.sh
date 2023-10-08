#!bin/bash

# Define a variable with docker network name
network_name="myNetwork"
# Although Compose works in all environments, it's more focused
# development and testing. Using Compose on a production environment is not recommended at all.
#删除未被使用的资源
docker system prune -f

if docker network inspect "$network_name" > /dev/null 2>&1; then
    echo "network '$network_name' exists."
else
    docker network create "$network_name"
fi

#rebuild
#docker-compose build
docker_container_rm "authapi"
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
docker run --detach --restart always --name authapi --publish 7800:7800 --network "$network_name" authapi:latest

#docker-compose build
docker_container_rm "fileapi"
docker image build --tag fileapi:latest --file ~/src/ioliz/dotnetcoreServer/fileServer/Dockerfile .
docker run --detach --restart always --name fileapi --publish 5000:5000 --network "$network_name" --volume ~/data/files:/release/wwwroot fileapi:latest

#docker-compose build
docker_container_rm "serviceapi"
docker image build --tag serviceapi:latest --file ~/src/ioliz/dotnetcoreServer/service/Dockerfile .
docker run --detach --restart always --name serviceapi --publish 6001:6001 --network "$network_name" serviceapi:latest


#docker-compose build
docker_container_rm "jsxbuild"
docker image build --tag jsxbuild:latest --file ~/src/ioliz/jsxBuildServer/Dockerfile .
docker run --detach --restart always --name  jsxbuild --publish 8888:8888 --network "$network_name" jsxbuild:latest


#docker-compose build
docker_container_rm "ffmpegapi"
docker image build --tag ffmpegapi:latest --file ~/src/ioliz/ffmpegServer/Dockerfile .
docker run --detach --restart always --name ffmpegapi --publish 9000:9000 --network "$network_name" ffmpegapi:latest

#docker network create myNetwork
docker_container_rm "nginxserver"
docker image build --tag nginxserver:latest --file ~/src/ioliz/reverseProxy/Dockerfile .
docker run --detach --restart always --name nginxserver --publish 80:80 --network "$network_name" --volume ~/www/app:/app --volume /www/home:/www nginxserver:latest


docker_container_rm(){
    # Define the name of the Docker container you want to check and remove if it exists
    container_name="$1"

    # Check if the container exists
    if docker ps -a --format '{{.Names}}' | grep -q "$container_name"; then
        # Container exists, so stop and remove it
        docker stop "$container_name"
        docker rm "$container_name"
        echo "Container '$container_name' has been removed."
    else
        echo "Container '$container_name' does not exist."
    fi
}