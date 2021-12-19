# run from parent dir
# ../fileServer/docker-compose build
FROM mcr.microsoft.com/dotnet/sdk:3.1
WORKDIR /member
COPY ["./member/Ioliz.member.csproj","/member"]
RUN ["dotnet","restore"]
COPY ./member /member
COPY ./shared /shared
RUN ["dotnet","build"]
EXPOSE 80/tcp
RUN chmod +x ./entrypoint.sh
CMD /bin/bash ./entrypoint.sh
