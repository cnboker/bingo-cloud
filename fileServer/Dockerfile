FROM microsoft/dotnet:3.1
COPY . /fileServer
WORKDIR /fileServer
RUN ["dotnet","restore"]
RUN ["dotnet","build"]
EXPOSE 80/tcp
RUN chmod +x ./entrypoint.sh
CMD /bin/bash ./entrypoint.sh
