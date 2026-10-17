# Spellcast

Spellcast is a hackathon project exploring spatial interaction with physical environments using hand gestures. The goal is to make everyday devices feel directly controllable through a webcam interface: point at a lamp or speaker, then use gestures to control it.

## Demo goals

- Point at a physical Zigbee lamp to select it.
- Use hand gestures to switch the lamp on or off and adjust its brightness.
- Point at a speaker to control music playback and volume.
- Swipe between Calm, Party, and Study scenes that coordinate lighting, music, and the interface.
- Present the experience through a polished, futuristic webcam interface.

## Planned stack

- React, TypeScript, and Vite for the frontend
- MediaPipe for webcam hand tracking
- Node.js for the backend
- Mosquitto and Zigbee2MQTT for Zigbee device control
- SONOFF Zigbee 3.0 USB Dongle Plus V2 (ZBDongle-E) as the coordinator
- Local music playback

## Development roadmap

1. **Hardware:** Connect the Mac to a Zigbee bulb through Zigbee2MQTT and verify physical control.
2. **Computer vision:** Add webcam hand tracking and object targeting.
3. **Contextual gestures:** Map gestures to actions based on the selected object.
4. **Scene engine:** Coordinate lighting, music, and interface changes.
5. **UI and demo polish:** Build and refine the futuristic webcam experience.

## Current progress

- Development machine: Apple Silicon Mac running macOS.
- Mosquitto is installed and running as a Homebrew service; local MQTT publish/subscribe messaging was verified.
- Zigbee2MQTT is installed in `~/zigbee2mqtt` and configured to use the SONOFF coordinator and local Mosquitto broker.
- The SONOFF ZBDongle-E was detected at `/dev/cu.usbserial-110`; Zigbee2MQTT identified its EmberZNet firmware as `7.4.4` and formed a network.
- An IKEA TRÅDFRI E27 color bulb was paired.
- Terminal MQTT commands successfully controlled the bulb's power and brightness.
- Webcam tracking, speaker control, scenes, and the Spellcast interface are not implemented yet.

## Hardware setup notes

The Zigbee2MQTT installation and its device data currently live outside this repository, in `~/zigbee2mqtt`. Keep that runtime configuration and coordinator data backed up separately; they are not part of the Spellcast source tree.

The local Zigbee2MQTT configuration uses:

- MQTT broker: `mqtt://localhost:1883`
- Coordinator port: `/dev/cu.usbserial-110`
- Adapter: `ember`

The USB serial path can change if the coordinator is reconnected or macOS assigns a different device name. Check the current device path before troubleshooting a connection.

## Working style

Spellcast is being built interactively, one step at a time. Commands and setup changes should be explained, and the hardware milestone should remain grounded in observed device behavior.
