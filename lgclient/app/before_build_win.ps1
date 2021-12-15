echo start before build
$root = (get-item $pwd).parent.FullName
Set-Location $root'/lib' 
npm run build
npm link
Set-Location $root'/app'
npm link lgservice

echo build fileService
# not support webpack
Set-Location $root'/service/fileService' 
npm run build 
#cd /Users/scott/code/ioliz/lgclient/service/fileService && cp index.js package.json services.json ./dist 
