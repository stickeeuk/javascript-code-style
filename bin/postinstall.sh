#!/usr/bin/env bash

cp -u dist/.eslintrc $1
cd $1 && npx install-peerdeps --dev eslint-config-stickee
