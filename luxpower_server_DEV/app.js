const express = require('express');
const bodyParser = require('body-parser');
const net = require('net');
const app = express();
const HTTP_PORT = 3000;
const TCP_PORT = 4346;
const fs = require('fs');
const path = require('path');


app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


const LUX_IP = '8.208.83.249'; // LUX IP address
const LUX_PORT = 4346; // Assuming LUX listens on the same port
const CONNECTION_STATUS_FILE = '/data/connectionStatus.json';

let connectionStatus = {
  Dongle: { connected: false, lastConnected: null, disconnections: 0 },
  LUX: { connected: false, lastConnected: null, disconnections: 0 },
  HomeAssistant: { connected: false, lastConnected: null, disconnections: 0 },
};

function loadConnectionStatus() {
  try {
    if (fs.existsSync(CONNECTION_STATUS_FILE)) {
      const data = fs.readFileSync(CONNECTION_STATUS_FILE, 'utf8');
      connectionStatus = JSON.parse(data);
    } else {
      // Initialize with default values if the file doesn't exist
      resetConnectionStatus();
    }
  } catch (err) {
    console.error('Error loading connection status:', err);
    resetConnectionStatus();
  }
}

function resetConnectionStatus() {
  connectionStatus = {
    Dongle: { connected: false, lastConnected: null, disconnections: 0 },
    LUX: { connected: false, lastConnected: null, disconnections: 0 },
    HomeAssistant: { connected: false, lastConnected: null, disconnections: 0 },
  };
  saveConnectionStatus();  // Save the reset status
}


function saveConnectionStatus() {
  fs.writeFile(CONNECTION_STATUS_FILE, JSON.stringify(connectionStatus, null, 2), (err) => {
    if (err) console.error('Failed to save connection status:', err);
    else console.log('Connection status saved successfully.');
  });
}

// Dongle Connections and disconnections
connectionStatus.Dongle.connected = true;
connectionStatus.Dongle.lastConnected = new Date();

// And when it disconnects:
connectionStatus.Dongle.connected = false;
connectionStatus.Dongle.disconnections += 1;

//LUX connections and disconnections
// Update these objects when connections are established or lost

connectionStatus.LUX.connected = true;
connectionStatus.LUX.lastConnected = new Date();

// And when it disconnects:
connectionStatus.LUX.connected = false;
connectionStatus.LUX.disconnections += 1;

//Home Assistant Connections and disconnections
connectionStatus.HomeAssistant.connected = true;
connectionStatus.HomeAssistant.lastConnected = new Date();

// And when it disconnects:
connectionStatus.HomeAssistant.connected = false;
connectionStatus.HomeAssistant.disconnections += 1;





let config = {
    dongleIP: null,
    homeAssistantIP: null,
    sendToLUX: false,
    sendToHomeAssistant: false, // Added flag for Home Assistant
  };

let sentPackets = [];
let receivedPackets = [];


let dongleSocket = null;
let homeAssistantSocket = null;
let luxSocket = null;
let initialPacket = null;

let selectLuxYes = '';
let selectLuxNo = '';
let selectHaYes = '';
let selectHaNo = '';

if (config.sendToLUX) {
    selectLuxYes = 'selected';
    selectLuxNo = '';
} else {
    selectLuxYes = '';
    selectLuxNo = 'selected';
}
if (config.sendToHomeAssistant) {
    selectHaYes = 'selected';
    selectHaNo = '';
} else {
    selectHaYes = '';
    selectHaNo = 'selected';
}





const CONFIG_FILE = '/data/config.json';

loadConfig();

function logPacket(packetArray, packet, isSent, source) {
  const packetLog = {
    timestamp: new Date().toLocaleString(),
    data: packet.toString('hex'),
    direction: isSent ? 'Sent' : 'Received',
    source: source // Include the source of the packet
  };
  packetArray.unshift(packetLog); // Use unshift to add the packet to the beginning of the array
  if (packetArray.length > 20) {
    packetArray.pop(); // Remove the oldest packet if the array exceeds 20 packets
  }
}

function saveConfig() {
  fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), (err) => {
    if (err) console.error('Failed to save configuration:', err);
    else console.log('Configuration saved successfully.');
  });
}

function getNormalizedAddress(address) {
    if (address && address.includes('::ffff:')) {
        return address.replace('::ffff:', '');
    }
    return address;
}


function connectToLUX() {
  if (config.sendToLUX) {
    if (!luxSocket || luxSocket.destroyed) {
      luxSocket = new net.Socket();
      luxSocket.connect(LUX_PORT, LUX_IP, () => {
        console.log('Connected to LUX');
        connectionStatus.LUX.connected = true;
        connectionStatus.LUX.lastConnected = new Date();
        saveConnectionStatus();
      });

      luxSocket.on('data', (data) => {
        if (dongleSocket) {
          dongleSocket.write(data);
          console.log(`Received data from LUX and forwarded to Dongle: ${data.toString('hex')}`);
        }
      });

      luxSocket.on('close', () => {
        console.log('Connection to LUX closed');
        luxSocket = null;
        connectionStatus.LUX.connected = false;
        connectionStatus.LUX.disconnections += 1;
        saveConnectionStatus();
      });

      luxSocket.on('error', (err) => {
        console.error('Connection to LUX error:', err);
        luxSocket.destroy();
        luxSocket = null;
      });
    }
  } else {
    if (luxSocket && !luxSocket.destroyed) {
      luxSocket.destroy();
      luxSocket = null;
      console.log('Disconnected from LUX');
      connectionStatus.LUX.connected = false;
      connectionStatus.LUX.disconnections += 1;
      saveConnectionStatus();
    }
  }
}


const tcpServer = net.createServer((socket) => {
  const remoteAddress = getNormalizedAddress(socket.remoteAddress);
  console.log(`TCP connection established from ${remoteAddress}`);

  // Check if the connected client is the Dongle
  if (remoteAddress === getNormalizedAddress(config.dongleIP)) {
    console.log('Dongle connected');
    dongleSocket = socket;
    connectionStatus.Dongle.connected = true;
    connectionStatus.Dongle.lastConnected = new Date();
    saveConnectionStatus();
  }
  // Check if the connected client is Home Assistant
  else if (remoteAddress === getNormalizedAddress(config.homeAssistantIP)) {
    console.log('Home Assistant connected');
    homeAssistantSocket = socket;
    connectionStatus.HomeAssistant.connected = true;
    connectionStatus.HomeAssistant.lastConnected = new Date();
    saveConnectionStatus();
  }

  socket.on('data', (data) => {
    handleIncomingData(socket, data);
  });

  socket.on('close', () => {
    console.log(`Connection closed by ${remoteAddress}`);
    // Clear the specific socket variable when its connection closes
    if (socket === dongleSocket) {
      console.log('Dongle socket closed');
      dongleSocket = null;
      connectionStatus.Dongle.connected = false;
      connectionStatus.Dongle.disconnections += 1;
      saveConnectionStatus();
    } else if (socket === homeAssistantSocket) {
      console.log('Home Assistant socket closed');
      homeAssistantSocket = null;
      connectionStatus.HomeAssistant.connected = false;
      connectionStatus.HomeAssistant.disconnections += 1;
      saveConnectionStatus();
    } else if (socket === luxSocket) {
      console.log('LUX socket closed');
      luxSocket = null;
      connectionStatus.LUX.connected = false;
      connectionStatus.LUX.disconnections += 1;
      saveConnectionStatus();
    }
  });

  socket.on('error', (err) => {
    console.error(`Socket error from ${remoteAddress}:`, err);
    // Enhanced logging for ECONNRESET
    if (err.code === 'ECONNRESET') {
        console.log(`ECONNRESET error from ${remoteAddress}. This might indicate the dongle was restarted or there was a network issue.`);
    }
    socket.destroy();
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP server listening on port ${TCP_PORT}`);
});


function handleIncomingData(socket, data) {
  const remoteAddress = getNormalizedAddress(socket.remoteAddress);
  let source = 'Unknown';
  let destinations = [];

  const normalizedDongleIP = getNormalizedAddress(config.dongleIP);
  const normalizedHomeAssistantIP = getNormalizedAddress(config.homeAssistantIP);
  const normalizedLUX_IP = getNormalizedAddress(LUX_IP);

  if (remoteAddress === normalizedDongleIP) {
    source = 'Dongle';
    logPacket(receivedPackets, data, false, source); // Log received data from the dongle
  } else if (remoteAddress === normalizedHomeAssistantIP) {
    source = 'Home Assistant';
    logPacket(sentPackets, data, true, source); // Log data sent to Home Assistant
  } else if (remoteAddress === normalizedLUX_IP) {
    source = 'LUX';
    logPacket(sentPackets, data, true, source); // Log data sent to LUX
  }

  console.log(`${source} sent data: ${data.toString('hex')}`);

  // Handling data from Dongle
  if (remoteAddress === normalizedDongleIP) {
    // Echo back logic
    if (!initialPacket) {
      initialPacket = data;
      socket.write(data); // Echo back
      destinations.push('Dongle (Echo back)');
    } else if (data.equals(initialPacket)) {
      socket.write(data); // Echo back
      destinations.push('Dongle (Echo back)');
    }

    if (dongleSocket === null) dongleSocket = socket;

    console.log(`Attempting to forward to Home Assistant. sendToHomeAssistant: ${config.sendToHomeAssistant}, homeAssistantSocket: ${homeAssistantSocket ? "Exists" : "Does not exist"}`);
    
    if (config.sendToHomeAssistant && homeAssistantSocket) {
      homeAssistantSocket.write(data);
      destinations.push('Home Assistant');
      console.log(`Data forwarded to Home Assistant: ${data.toString('hex')}`);
    } else {
      console.log(`Conditions not met to forward to Home Assistant.`);
    }

    if (config.sendToLUX && luxSocket) {
      luxSocket.write(data);
      destinations.push('LUX');
    }
  }

  // Handling data from Home Assistant
  if (remoteAddress === normalizedHomeAssistantIP) {
    if (dongleSocket) {
      dongleSocket.write(data);
      destinations.push('Dongle');
    }
  }

  // Handling data from LUX
  if (remoteAddress === normalizedLUX_IP) {
    if (dongleSocket) {
      dongleSocket.write(data);
      destinations.push('Dongle');
    }
  }

  if (destinations.length) {
    console.log(`${source} sent data to: ${destinations.join(', ')}`);
    destinations.forEach(destination => {
      logPacket(sentPackets, data, true, source); // Log sent data for each destination
    });
  } else {
    console.log(`${source} sent data, but no action taken: ${data.toString('hex')}`);
  }
}



app.post('/configure', (req, res) => {
  console.log('Received configuration:', req.body);
  
  config.dongleIP = req.body.dongleIP;
  config.homeAssistantIP = req.body.homeAssistantIP;
  const prevSendToLUX = config.sendToLUX;
  config.sendToLUX = req.body.sendToLUX === 'yes';
  config.sendToHomeAssistant = req.body.sendToHomeAssistant === 'yes';
  
  saveConfig();
  console.log('Configuration updated:', config);

  // Check if the LUX connection state should change
  if (prevSendToLUX !== config.sendToLUX) {
    connectToLUX();
  }

  res.send('Configuration updated successfully');
});
app.get('/', (req, res) => {
  fs.readFile('index.html', 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading index.html file:', err);
      return res.status(500).send('Error loading configuration page');
    }

    // Replace configuration placeholders
    html = html.replace('{{dongleIP}}', config.dongleIP || '')
               .replace('{{homeAssistantIP}}', config.homeAssistantIP || '')
               .replace('{{selectHaNo}}', !config.sendToHomeAssistant ? 'selected' : '')
               .replace('{{selectHaYes}}', config.sendToHomeAssistant ? 'selected' : '')
               .replace('{{selectLuxNo}}', !config.sendToLUX ? 'selected' : '')
               .replace('{{selectLuxYes}}', config.sendToLUX ? 'selected' : '');

    res.send(html);
  });
});


app.get('/api/connection-status', (req, res) => {
  fs.readFile(CONNECTION_STATUS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading connection status file:', err);
      res.status(500).send('Error loading connection status');
    } else {
      res.json(JSON.parse(data));
    }
  });
});

// Endpoint to get the last 20 sent packets
app.get('/api/sent-packets', (req, res) => {
  res.json(sentPackets.slice(-20));
});

// Endpoint to get the last 20 received packets
app.get('/api/received-packets', (req, res) => {
  res.json(receivedPackets.slice(-20));
});



function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      config = JSON.parse(data);
      console.log('Configuration loaded:', config);
    } else {
      console.log('config.json does not exist. Creating with default configuration.');
      saveConfig();  // This will create the file with the current config object.
    }
  } catch (err) {
    console.log('Error handling the configuration file:', err);
  }
}


app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`Configuration server running at http://localhost:${HTTP_PORT}`);
    connectToLUX();
});
