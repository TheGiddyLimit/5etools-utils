#/bin/bash

set -e

if [[ $# -eq 0 ]]; then
    echo "No arguments provided. Usage: ./transfer.sh <project-dir>"
    exit 1
fi

echo "Cleaning..."

rm -rf scratch/5etools-utils-*.tgz
rm -rf scratch/package

echo "Building..."

npm run build
npm pack --pack-destination scratch/

echo "Unpacking..."

tar zxf scratch/5etools-utils-*.tgz -C scratch/

echo "Copying..."

mkdir -p "$1"/node_modules/5etools-utils
cp -rf scratch/package/* "$1"/node_modules/5etools-utils/

echo "Copied to ${1}/node_modules/5etools-utils/"
