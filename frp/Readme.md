# Frpc Configration

## Download frp

```shell
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz

tar -xzvf frp_0.52.3_linux_amd64.tar.gz

cp ./frp_0.52.3_linux_amd64/frpc /usr/bin/frpc

```

## Create a Service File

Open text editer and create file frpc.service

```ini
[Unit]
Description=frp client
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/usr/bin/frpc -c  /etc/frp/frpc.toml
Restart=always
RestartSec=20s
User=nobody
LimitNOFILE=infinity

[Install]
WantedBy=multi-user.target
```

## Copy the service file:

Copy the service file to the appropriate directory for your Linux distribute, the typical location is '/etc/systemd/system

```bash

sudo cp frpc.service /etc/systemd/system
```

## Reload Systemd

After adding or modifying  a serice file , you need to reload the Systemd manager configuration:

```bash
sudo systemctl daemon-reload
```

## AutoStart when Reboot

```bash
sudo systemctl enable frpc

```
