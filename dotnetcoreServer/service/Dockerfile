FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /service
COPY ["./service/Ioliz.service.csproj","/service"]
RUN ["dotnet","restore"]
COPY ./service /service
COPY ./shared /shared
RUN dotnet build -c Release -o output

ENV ASPNETCORE_ENVIRONMENT=”production”

# 使用aspnet执行程序，这样可以减少容器文件的大小,未优化前1G，采用aspnet后200M
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime
COPY --from=build /service/output ./release
COPY ./service/Views ./release/Views
RUN mkdir -p ./release/wwwroot
COPY ./service/wwwroot/jquery-weui ./release/wwwroot/jquery-weui
WORKDIR /release
#EXPOSE 80/tcp
# RUN chmod +x ./entrypoint.sh
# CMD /bin/bash ./entrypoint.sh
ENTRYPOINT ["dotnet", "Ioliz.service.dll"]
