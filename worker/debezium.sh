#!/bin/bash
#
PROPERTIES=$(<application.properties) &&
PROPERTIES="${PROPERTIES//DB_HOST/$DB_HOST}" &&
PROPERTIES="${PROPERTIES//DB_PORT/$DB_PORT}" &&
PROPERTIES="${PROPERTIES//DB_NAME/$DB_NAME}" &&
PROPERTIES="${PROPERTIES//DB_USER/$DB_USER}" &&
PROPERTIES="${PROPERTIES//DB_PASSWORD/$DB_PASSWORD}" &&
echo "${PROPERTIES}" > ./debezium-server/conf/application.properties &&
cd debezium-server && ./run.sh
