#!/bin/bash

./nats-server -js &
sleep 1 && node dist/worker/src/reset.js && ./debezium.sh &
sleep 20 && LOG_LEVEL=DEBUG node dist/worker/src/index.js &
wait