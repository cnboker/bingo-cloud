#!/bin/bash

echo push local files to webos device
$ scp -r config.js index.htm stream.js mime.js types.json root@192.168.50.205:/home/root/dclient