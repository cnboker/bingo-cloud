#!/bin/bash
echo start before build
cd /Users/scott/code/ioliz/lgclient/lib&&npm run build
cd /Users/scott/code/ioliz/lgclient/testApp &&npm link lgservice

echo build fileService
cd /Users/scott/code/ioliz/lgclient/service/fileService && npm run build 
