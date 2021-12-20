FROM mcr.microsoft.com/dotnet/nightly/sdk:3.1 AS build
WORKDIR /member
COPY ["./member/Ioliz.member.csproj","/member"]
RUN ["dotnet","restore"]
COPY ./member /member
COPY ./shared /shared
RUN dotnet build -c Release -o output
# 使用aspnet执行程序，这样可以减少容器文件的大小,未优化前1G，采用aspnet后200M
FROM mcr.microsoft.com/dotnet/nightly/aspnet:3.1 AS runtime
COPY --from=build /member/output ./release
# COPY /member/wait-for-it.sh ./release
# COPY /fileServer/entrypoint.sh .
WORKDIR /release

ENTRYPOINT ["dotnet", "Ioliz.member.dll"]
