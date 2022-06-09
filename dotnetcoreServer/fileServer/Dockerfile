# run from parent dir
# 使用sdk编译程序
FROM mcr.microsoft.com/dotnet/sdk:6.0  AS build

# FROM mcr.microsoft.com/dotnet/core/aspnet:3.1 AS runtime
WORKDIR /fileServer
COPY ["./fileServer/fileServer.csproj","/fileServer"]
RUN ["dotnet","restore"]
COPY ./fileServer /fileServer
COPY ./shared /shared
# RUN ["dotnet","build"]
RUN dotnet build -c Release -o output
# 使用aspnet执行程序，这样可以减少容器文件的大小,未优化前1G，采用aspnet后200M
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime
#根目录是ioliz,因为context是../
#ADD ./fileServer/sources.list /etc/apt/
#RUN apt update -y && apt install -y ffmpeg 

COPY --from=build /fileServer/output ./release

#COPY /fileServer/entrypoint.sh .
WORKDIR /release
EXPOSE 5000
ENTRYPOINT ["dotnet", "fileServer.dll"]
#RUN chmod +x ./entrypoint.sh
#CMD /bin/bash ./entrypoint.sh
