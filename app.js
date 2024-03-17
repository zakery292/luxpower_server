const express = require('express');
const bodyParser = require('body-parser');
const net = require('net');
const path = require('path');
const fs = require('fs');
const app = express();
const HTTP_PORT = 3000;
const TCP_PORT = 4346;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

let config = {
  dongleIP: null,
  homeAssistantIP: null,
  sendToLUX: false,
  sendToHomeAssistant: false,
};

const CONFIG_FILE = './config.json';
loadConfig();

app.get('/', (req, res) => {
    fs.readFile('index.html', 'utf8', (err, html) => {
        if (err) {
            console.error('Error reading index.html file:', err);
            return res.status(500).send('Error loading configuration page');
        }

        // Replace configuration placeholders
        html = html.replace('{{dongleIP}}', config.dongleIP || '')
                   .replace('{{homeAssistantIP}}', config.homeAssistantIP || '')
                   .replace('{{selectLuxYes}}', config.sendToLUX ? 'selected' : '')
                   .replace('{{selectLuxNo}}', !config.sendToLUX ? 'selected' : '')
                   .replace('{{selectHaYes}}', config.sendToHomeAssistant ? 'selected' : '')
                   .replace('{{selectHaNo}}', !config.sendToHomeAssistant ? 'selected' : '');

        // Generate HTML for packets
        const sentPacketsHtml = sentPackets.slice(-20).map(packet => 
            `<p>Timestamp: ${packet.timestamp}, Direction: ${packet.direction}, Data: ${packet.data}</p>`
        ).join('');
        const receivedPacketsHtml = receivedPackets.slice(-20).map(packet => 
            `<p>Timestamp: ${packet.timestamp}, Direction: ${packet.direction}, Data: ${packet.data}</p>`
        ).join('');

        // Inject packet data into HTML
        html = html.replace('<!-- Dynamically load last 20 sent packets -->', sentPacketsHtml)
                   .replace('<!-- Dynamically load last 20 received packets -->', receivedPacketsHtml);

        res.send(html);
    });
});

// Configuration endpoint
app.post('/configure', (req, res) => {
  config.dongleIP = req.body.dongleIP;
  config.homeAssistantIP = req.body.homeAssistantIP;
  config.sendToLUX = req.body.sendToLUX === 'yes';
  config.sendToHomeAssistant = req.body.sendToHomeAssistant === 'yes';
  
  console.log('Configuration updated:', config);
  saveConfig();
  res.send('Configuration updated successfully');
});

const LUX_IP = '8.208.83.249'; // LUX IP address
const LUX_PORT = 4346; // Assuming LUX listens on the same port

let sentPackets = [];
let receivedPackets = [];

let dongleSocket = null;
let homeAssistantSocket = null;
let luxSocket = null;
let initialPacket = null;

function logPacket(packetArray, packet, isSent) {
    const packetLog = {
        timestamp: new Date().toLocaleString(),
        data: packet.toString('hex'),
        direction: isSent ? 'Sent' : 'Received'
    };
    packetArray.push(packetLog);
    if (packetArray.length > 20) {
        packetArray.shift(); // Keep only the last 20 packets
    }
}

function getNormalizedAddress(address) {
    if (address && address.includes('::ffff:')) {
        return address.replace('::ffff:', '');
    }
    return address;
}

function connectToLUX() {
    if (!config.sendToLUX || luxSocket) {
        return;
    }

    luxSocket = new net.Socket();

    luxSocket.connect(LUX_PORT, LUX_IP, () => {
        console.log('Connected to LUX');
    });

    luxSocket.on('data', (data) => {
        if (dongleSocket) {
            dongleSocket.write(data);
            console.log(`Received data from LUX and forwarded to Dongle: ${data.toString('hex')}`);
        }
    });

    luxSocket.on('close', () => {
        console.log('Connection to LUX closed');
        if (config.sendToLUX) {
            console.log('Attempting to reconnect to LUX...');
            connectToLUX();
        } else {
            luxSocket = null;
        }
    });

    luxSocket.on('error', (err) => {
        console.error('Connection to LUX error:', err);
        luxSocket.destroy();
        luxSocket = null;
    });
}

const tcpServer = net.createServer((socket) => {
    const remoteAddress = getNormalizedAddress(socket.remoteAddress);
    console.log(`TCP connection established from ${remoteAddress}`);

    if (remoteAddress === getNormalizedAddress(config.dongleIP)) {
        console.log('Dongle connected');
        dongleSocket = socket;
    } else if (remoteAddress === getNormalizedAddress(config.homeAssistantIP)) {
        console.log('Home Assistant connected');
        homeAssistantSocket = socket;
    }

    socket.on('data', (data) => {
        handleIncomingData(socket, data);
    });

    socket.on('close', () => {
        console.log(`Connection closed by ${remoteAddress}`);
        if (socket === dongleSocket) {
            console.log('Dongle socket closed');
            dongleSocket = null;
        } else if (socket === homeAssistantSocket) {
            console.log('Home Assistant socket closed');
            homeAssistantSocket = null;
        } else if (socket === luxSocket) {
            console.log('LUX socket closed');
            luxSocket = null;
        }
    });

    socket.on('error', (err) => {
        console.error(`Socket error from ${remoteAddress}:`, err);
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
    } else if (remoteAddress === normalizedHomeAssistantIP) {
        source = 'Home Assistant';
    } else if (remoteAddress === normalizedLUX_IP) {
        source = 'LUX';
    }

    logPacket(receivedPackets, data, false);
    console.log(`${source} sent data: ${data.toString('hex')}`);

    if (remoteAddress === normalizedDongleIP) {
        if (!initialPacket) {
            initialPacket = data;
            socket.write(data);
            destinations.push('Dongle (Echo back)');
        } else if (data.equals(initialPacket)) {
            socket.write(data);
            destinations.push('Dongle (Echo back)');
        }

        if (dongleSocket === null) dongleSocket = socket;

        if (config.sendToHomeAssistant && homeAssistantSocket) {
            homeAssistantSocket.write(data);
            destinations.push('Home Assistant');
        }

        if (config.sendToLUX && luxSocket) {
            luxSocket.write(data);
            destinations.push('LUX');
        }
    }

    if (remoteAddress === normalizedHomeAssistantIP && dongleSocket) {
        dongleSocket.write(data);
        destinations.push('Dongle');
    }

    if (remoteAddress === normalizedLUX_IP && dongleSocket) {
        dongleSocket.write(data);
        destinations.push('Dongle');
    }

    if (destinations.length) {
        console.log(`${source} sent data to: ${destinations.join(', ')}`);
        destinations.forEach(destination => logPacket(sentPackets, data, true));
    } else {
        console.log(`${source} sent data, but no action taken: ${data.toString('hex')}`);
    }
}


function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(data);
    console.log('Configuration loaded:', config);
  } catch (err) {
    console.log('No existing configuration found, using defaults.');
  }
}

function saveConfig() {
  fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), (err) => {
    if (err) console.error('Failed to save configuration:', err);
    else console.log('Configuration saved successfully.');
  });
}

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`Configuration server running at http://localhost:${HTTP_PORT}`);
    connectToLUX();
});
