rm mesh-serve
rm sea-prep.blob

node --experimental-sea-config sea-config.json

cp $(command -v node) mesh-serve

codesign --remove-signature mesh-serve

npx postject mesh-serve NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA

codesign --sign - mesh-serve

./mesh-serve
