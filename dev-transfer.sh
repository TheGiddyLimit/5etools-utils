#/bin/bash

set -e

if [[ $# -eq 0 ]]; then
    echo "No arguments provided. Usage: ./transfer.sh <project-dir>"
    exit 1
fi

PACK_DEST="$(pwd)/scratch"

echo "Cleaning..."

rm -f "${PACK_DEST}"/5etools-utils-*.tgz
rm -rf "${PACK_DEST}/package"

echo "Building..."

npm run build
npm pack --pack-destination "${PACK_DEST}"

echo "Installing..."

VERSION=$(node -p "require('./package.json').version")
pushd "$1"
npm i "${PACK_DEST}/5etools-utils-${VERSION}.tgz"
popd

echo "Done!"
