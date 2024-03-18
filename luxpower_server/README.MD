# Luxpower Dongle Server Main

## Description

The Luxpower Dongle Server is designed to interface with BH/BG serial number dongles, providing a secure, local connection to Home Assistant. This solution enhances network security by limiting the data sent externally, ensuring that all information remains within your local network.

For the server to operate, an external device must be purchased separately from [Renewable Revolution](https://renwablerevolution.co.uk). This device acts as a relay between the dongle and your Home Assistant setup.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fzakery292%2Fhomeassistant_nodjs)

## How to Use

### Installation

1. Install the addon through Home Assistant. Either by clicking the button above to add the repo to your addon store or by manually copying the URL of this repo and adding it to the addon store
3. Once installed, start the server to access the web UI.

### Configuration

In the web UI:
1. Enter the IP address of the relay device you purchased, found on your LAN, into the "Dongle IP" field.
2. Input the IP address of the Home Assistant instance where the addon is running into the "Home Assistant IP" field.
3. Set "Communicate with Home Assistant" to "Yes" if you want the dongle to connect with Home Assistant.
4. Optionally, set "Communicate with LUX" to "Yes" if you want to maintain communication with LUX servers.
5. Click "Save Configuration" to update the server settings.

### Lux Python Addon Setup

For the Lux Python addon, which you will receive separately:
1. Set the "Dongle IP" to the IP address of your Home Assistant instance.
2. Set the port to `4346`.
3. Enter the dongle and inverter serial numbers as provided.
4. Click "Save" to initiate the Lux Python integration.

If configured correctly, you will see "Dongle Sent" and "Home Assistant Sent" notifications in the sent and receive logs on the web portal.

### Monitoring

Leave the system running to begin receiving data in your Home Assistant instance. The server will transmit data approximately every 8-20 seconds, allowing for real-time monitoring and control.

## Support

For support and further inquiries, please visit [Renewable Revolution Support](https://renwablerevolution.co.uk/support).
