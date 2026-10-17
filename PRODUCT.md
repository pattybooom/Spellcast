# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Electron with React and TypeScript; delegated to the implementation because the user explicitly selected this stack.

## Users

The initial user is the developer building Spellcast on an Apple Silicon Mac. The longer-term audience is people who want to control devices in their physical environment through hand gestures.

## Product Purpose

Spellcast explores spatial interaction with physical environments. Success means pointing at a physical device and controlling it with gestures.

## Positioning

Spellcast uses a webcam view and hand gestures to make physical devices feel directly controllable.

## Operating Context

The first hand-tracking milestone runs on macOS with a webcam. The developer has verified control of an IKEA TRÅDFRI E27 color bulb using a SONOFF ZBDongle-E, Zigbee2MQTT, and a local Mosquitto broker.

## Capabilities and Constraints

- Verified: local MQTT commands control the paired Zigbee bulb through the existing Zigbee2MQTT setup.
- Planned: webcam hand tracking, spatial targeting, gesture control, scenes, and local music playback.
- Keep the Zigbee2MQTT runtime and coordinator data in `~/zigbee2mqtt`; do not modify them unnecessarily.
- Hand tracking, gesture interpretation, and device control should remain logically separated.
- The current desktop foundation should keep renderer and native integrations securely separated.
- Camera and MediaPipe behavior are not yet implemented or verified.

## Evidence on Hand

The repository README records the verified Zigbee hardware path and MQTT control evidence. No webcam tracking or Spellcast interface is implemented yet.

## Product Principles

- Keep physical device control grounded in local, verified integrations.
- Separate perception, gesture interpretation, and device actions.
- Build toward direct spatial control while making unimplemented states clear.

## Open Decisions

Long-term audience beyond the developer, accessibility requirements, and future computer-environment integrations remain undecided.
