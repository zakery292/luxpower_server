#!/bin/bash
echo "Starting Node Js Server"
# Load options from environment variables
echo "Loading Config"

DONGLE_IP=${DONGLE_IP:-null}
echo "DONGLE_IP: $DONGLE_IP"

HOME_ASSISTANT_IP=${HOME_ASSISTANT_IP:-null}
echo "HOME_ASSISTANT_IP: $HOME_ASSISTANT_IP"

# Assuming these are boolean values, defaulting to false if not set
SEND_TO_LUX=${SEND_TO_LUX:-false}
echo "SEND_TO_LUX: $SEND_TO_LUX"

SEND_TO_HOME_ASSISTANT=${SEND_TO_HOME_ASSISTANT:-false}
echo "SEND_TO_HOME_ASSISTANT: $SEND_TO_HOME_ASSISTANT"

export DONGLE_IP HOME_ASSISTANT_IP SEND_TO_LUX SEND_TO_HOME_ASSISTANT

# Output the IP address of the Node.js server
echo "Node.js server will be accessible on the following IP address(es): $(hostname -I)"

# Start the Node.js application
node /usr/src/app/app.js
echo "Node.js server has Started"
