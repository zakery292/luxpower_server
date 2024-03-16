#!/usr/bin/with-contenv bashio

# Load options from Home Assistant add-on configuration
DONGLE_IP=$(bashio::config 'dongleIP')
HOME_ASSISTANT_IP=$(bashio::config 'homeAssistantIP')
SEND_TO_LUX=$(bashio::config 'sendToLUX')
SEND_TO_HOME_ASSISTANT=$(bashio::config 'sendToHomeAssistant')

# Export the variables so they are accessible to the Node.js app
export DONGLE_IP HOME_ASSISTANT_IP SEND_TO_LUX SEND_TO_HOME_ASSISTANT

# Output the IP address of the Node.js server
echo "Node.js server will be accessible on the following IP address(es): $(hostname -I)"

# Start the Node.js application
node /usr/src/app/app.js