#!/bin/bash
echo start before build
cd /Users/scott/code/ioliz/lgclient/lib && npm run build
cd /Users/scott/code/ioliz/lgclient/app && npm link lgservice

echo build fileService
# not support webpack
cd /Users/scott/code/ioliz/lgclient/service/fileService && npm run build 
#cd /Users/scott/code/ioliz/lgclient/service/fileService && cp index.js package.json services.json ./dist 
