# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [2.50]

### Added 
- Added new UI content for the webpage three new columns for Connection status, uptime monitor, drop rate for connections
- Added functionalty to update the new columns data based o nthe refresh rate of the packet data 
- Added Ensured the data in the new columns persists on web page restart 
- Added who sent what data in the packet frames on the webpage 
- CSS Stylining everyline is now commented so its easier to adjust CSS when making amendments
- Dropped connections added This will count every time a socket is closed as a dropped connection. The is a not problem that sometimes the donlge opens a new socket but never closes the first one i think this is a ESP issue im not sure.
- Uptime Added 
- Connection status added
- Webserver is our new web portal, removed the ability for us to send data and left the webpage being able to send the donlge data.
- Added Dongle Serial number field so we can match connection from nodeJS to the webserver for incoming commands from webportal.
- Added Packet Counter for lux connections it only gets 10 packets per request from them to limit spam from us the them. 


## fixed
- Disconnection and reconnection of LUX server connection at any point not just on server start
- small bug fixes and code amendments 
- If the homeassistant socket did not register but we are receiving data then update the socket reference and update the webpage with the new data
- On socket drop the LUX connection will auto reconnect providing that it is enabled in the config

## Changed
- Serverside logic for packet routing
- Changed what dongles are allowed to connect to the nodeJS server BA dongles will not be allowed to join the network The packets will not be routed

## [2.02]

### Fixed 
- Fixed the displaying of the source on the received packets as well as sent packets in the webpage

## [2.01]

### Fixed 
- Issue where the Server would not start when the dongle communicated

## [2.00]

### Added
- Dynamic updates for lux connections you can now turn this on and off when you like and it will connect and disconnect as required

### Changed
- Added what device sent what data in the webpage UI and limited the packets to 20 instead of unlimited

## [1.50]

### Added 
- UI upgrades to the webpage design and functionality improvements

## [1.00]

### Fixed
- Resolved minor issues around functionality with the webpage and server scripting

## [0.05] - 2024-03-18

### Fixed
- most major bugs to get the server to start

## [0.01] - 2024-03-17

### Added
- initial commit

### Changed


### Fixed
