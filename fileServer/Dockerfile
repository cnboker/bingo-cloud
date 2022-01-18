# run from parent dir
# 使用sdk编译程序
FROM mcr.microsoft.com/dotnet/core/sdk:3.1  AS build

# FROM mcr.microsoft.com/dotnet/core/aspnet:3.1 AS runtime
WORKDIR /fileServer
COPY ["./fileServer/fileServer.csproj","/fileServer"]
RUN ["dotnet","restore"]
COPY ./fileServer /fileServer
COPY ./shared /shared
# RUN ["dotnet","build"]
RUN dotnet build -c Release -o output
# 使用aspnet执行程序，这样可以减少容器文件的大小,未优化前1G，采用aspnet后200M
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1 AS runtime

#System.Drawing.Common 组件提供对GDI+图形功能的访问。它是依赖于GDI+的，那么在Linux上它如何使用GDI+，
#因为Linux上是没有GDI+的。Mono 团队使用C语言实现了GDI+接口，提供对非Windows系统的GDI+接口访问能力
# （个人认为是模拟GDI+，与系统图像接口对接），这个就是 libgdiplus。
RUN apt update -y && apt install -y libgdiplus 

COPY --from=build /fileServer/output ./release
#COPY /fileServer/entrypoint.sh .
WORKDIR /release
EXPOSE 5000/tcp
ENTRYPOINT ["dotnet", "fileServer.dll"]
#RUN chmod +x ./entrypoint.sh
#CMD /bin/bash ./entrypoint.sh
