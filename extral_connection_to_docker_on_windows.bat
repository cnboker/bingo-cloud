-- $wsl_ip = (wsl hostname -I).trim() 
$wsl_ip = docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' member_server_1
echo $wsl_ip
$wsl_ip = 172.18.0.3
$port = 7800
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wsl_ip connectport=$port
netsh advfirewall firewall add rule name="myauthApp" dir=in action=allow protocol=TCP localport=$port remoteport=$port

$port = 6001
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wsl_ip connectport=$port
netsh advfirewall firewall add rule name="serviceApp" dir=in action=allow protocol=TCP localport=$port remoteport=$port

$port = 5000
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wsl_ip connectport=$port
netsh advfirewall firewall add rule name="fileSeverApp" dir=in action=allow protocol=TCP localport=$port remoteport=$port


netsh interface portproxy show v4tov4
--netsh advfirewall firewall show rule "myauthApp"

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port
netsh advfirewall firewall del rule name="authApp"
netsh interface portproxy show v4tov4
netsh advfirewall firewall show rule "authApp"