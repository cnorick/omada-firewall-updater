#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

if ! [ -x "$(command -v curl)" ]; then
  echo 'Error: curl is not installed.'
  echo 'Install curl and re-run'
  exit
fi

SYSTEMD_DIR=/lib/systemd/system/
APP_DIR=/opt/omada-firewall-updater
SERVICE_NAME=omada-firewall-updater.service

if ! [ -d "/root/.nvm" ]; then
  echo 'Error: nvm is not installed.'
  echo 'Installing nvm.'
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  echo 'nvm installed. Restart the terminal.'
  exit
fi

echo clearing app folder
rm -rf "${APP_DIR}"/*

echo copying files
mkdir -p "${APP_DIR}"
cp -rf . "${APP_DIR}"
cp .env "${APP_DIR}"
cp .nvmrc "${APP_DIR}"
chmod -R 777 "${APP_DIR}"

echo npm installing
cd "${APP_DIR}"
source /root/.bashrc
nvm install
/root/.nvm/nvm-exec npm i

echo installing systemd unit
mkdir -p $SYSTEMD_DIR
cp -f "${SERVICE_NAME}" $SYSTEMD_DIR
systemctl daemon-reload

echo enabling service
systemctl enable $SERVICE_NAME

echo restarting service
systemctl restart $SERVICE_NAME

echo setup done