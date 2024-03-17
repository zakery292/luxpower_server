#!/bin/bash
echo "Starting Node Js Server"
# Load options from environment variables
echo "Loading Config"

# Output the IP address of the Node.js server
echo "Node.js server will be accessible on the following IP address(es): $(hostname -I)"

# Start the Node.js application
node /usr/src/app/app.js
echo "Node.js server has Started"
