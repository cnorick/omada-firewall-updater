#!/bin/bash

pi=${1:-caddy}
tmp_folder="~/omada-firewall-updater"

echo "copying files to test machine (${pi}:${tmp_folder})"
rsync -au * ${pi}:${tmp_folder}
rsync .env ${pi}:${tmp_folder}
rsync .nvmrc ${pi}:${tmp_folder}

# echo running install script
# ssh ${pi} << EOF
#   cd ${tmp_folder}
#   ./scripts/install.sh
# EOF