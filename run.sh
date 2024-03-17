#!/usr/bin/with-contenv bashio
echo "Starting Node Js Server"
# Load options from Home Assistant add-on configuration
echo "Lodoing Congifg"
DONGLE_IP=$(bashio::config 'dongleIP')
echo "DONGLE_IP: $DONGLE_IP"
HOME_ASSISTANT_IP=$(bashio::config 'homeAssistantIP')
echo "HOME_ASSISTANT_IP: $HOME_ASSISTANT_IP"
SEND_TO_LUX=$(bashio::config 'sendToLUX')
echo "SEND_TO_LUX: $SEND_TO_LUX"
SEND_TO_HOME_ASSISTANT=$(bashio::config 'sendToHomeAssistant')
echo "SEND_TO_HOME_ASSISTANT: $SEND_TO_HOME_ASSISTANT"

export DONGLE_IP
export HOME_ASSISTANT_IP
export SEND_TO_LUX
export SEND_TO_HOME_ASSISTANT
# Export the variables so they are accessible to the Node.js app
export DONGLE_IP HOME_ASSISTANT_IP SEND_TO_LUX SEND_TO_HOME_ASSISTANT

# Output the IP address of the Node.js server
echo "Node.js server will be accessible on the following IP address(es): $(hostname -I)"


# Start the Node.js application
node /usr/src/app/app.js
echo "Node Js server has Started"
