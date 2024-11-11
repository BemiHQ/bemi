#!/bin/bash

sleep 20 && LOG_LEVEL=DEBUG node dist/worker/src/index.js &
wait
