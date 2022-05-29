FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build
WORKDIR /service
COPY ["./service/Iolize.service.csproj","/service"]
RUN ["dotnet","restore"]
COPY ./service /service
COPY ./shared /shared
RUN dotnet build -c Release -o output

# 使用aspnet执行程序，这样可以减少容器文件的大小,未优化前1G，采用aspnet后200M
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1 AS runtime
COPY --from=build /service/output ./release
RUN mkdir -p ./release/wwwroot
WORKDIR /release
#EXPOSE 80/tcp
# RUN chmod +x ./entrypoint.sh
# CMD /bin/bash ./entrypoint.sh
ENTRYPOINT ["dotnet", "Iolize.service.dll"]
