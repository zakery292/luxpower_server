const express = require('express');
const bodyParser = require('body-parser');
const net = require('net');
const path = require('path'); // Include the path module
const app = express();
const HTTP_PORT = 3000;
const TCP_PORT = 4346;
const fs = require('fs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); // 

// Configuration now comes from environment variables
let config = {
    dongleIP: process.env.DONGLE_IP || null,
    homeAssistantIP: process.env.HOME_ASSISTANT_IP || null,
    sendToLUX: process.env.SEND_TO_LUX === 'true',
    sendToHomeAssistant: process.env.SEND_TO_HOME_ASSISTANT === 'true',
};
console.log("Current configuration:", config);

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`Configuration server running at http://localhost:${HTTP_PORT}`);
    connectToLUX();
});
