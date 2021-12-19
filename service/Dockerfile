# run from parent dir
# ../fileServer/docker-compose build
FROM mcr.microsoft.com/dotnet/sdk:3.1
WORKDIR /service
COPY ["./service/Iolize.service.csproj","/service"]
RUN ["dotnet","restore"]
COPY ./service /service
COPY ./shared /shared
RUN ["dotnet","build"]
EXPOSE 80/tcp
RUN chmod +x ./entrypoint.sh
CMD /bin/bash ./entrypoint.sh
