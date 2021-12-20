$wsl_ip = (wsl hostname -I).trim() 
$port = 7800
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wsl_ip connectport=$port
netsh advfirewall firewall add rule name="authApp" dir=in action=allow protocol=TCP localport=$port remoteport=$port
netsh interface portproxy show v4tov4
netsh advfirewall firewall show rule "authApp"

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port
netsh advfirewall firewall del rule name="authApp"
netsh interface portproxy show v4tov4
netsh advfirewall firewall show rule "authApp"