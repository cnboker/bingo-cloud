#!/bin/bash

echo push local files to webos device
$ scp -r config.js index.htm stream.js mime.js types.json root@192.168.50.205:/home/root/dclient
scp *.* root@192.168.50.205:/media/developer/apps/usr/palm/services/com.ioliz.dc.app.bootservice

curl http://localhost:8888
systemctl status httpserver.service
systemctl status dclient.service
