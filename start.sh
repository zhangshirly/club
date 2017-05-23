#!/bin/bash

forever stop app.js
# set debug false
sed -i '0,/debug: true/s/debug: true/debug: false/' config.js
# npm install
# make build
# gulp dist
chmod +rx -R public/*
forever start -c ./bin/node-v6.10.3-linux-x64/bin/node app.js
