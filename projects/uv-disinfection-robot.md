# Autonomous UV Disinfection Robot

> Computer-vision-assisted robotics project for autonomous UV disinfection workflows.

[← Back to profile](../README.md)

---

## Overview

This project combines robotics and computer vision to support autonomous UV disinfection in indoor environments.

The vision pipeline uses YOLOv5-based object detection with Python to identify relevant scene elements and support navigation / operational decisions for the robot.

---

## Core Stack

- Python
- YOLOv5
- Computer Vision
- Object Detection
- Robotics Integration

---

## System Concept

```mermaid
flowchart LR
    C[Camera Input] --> V[YOLOv5 Detection]
    V --> D[Detected Objects]
    D --> L[Decision Logic]
    L --> R[Robot Action]
    R --> U[UV Disinfection Workflow]
```

---

## Engineering Focus

### Vision

- Object detection with YOLOv5
- Scene understanding from camera input
- Detection-driven operational logic

### Robotics

- Translating detections into robot decisions
- Supporting autonomous movement and workflow execution
- Integrating perception with physical-system behavior

### Applied AI

The project demonstrates use of computer vision in a physical-system context rather than as an isolated image-classification experiment.

---

## Main Challenges

- Reliable detection in changing indoor conditions
- Connecting vision outputs to deterministic robot behavior
- Balancing model accuracy and runtime requirements
- Handling physical-system constraints that do not exist in offline ML experiments

---

## Project Value

This project strengthened practical experience across:

```text
Computer Vision
Object Detection
Python
Applied AI
Robotics Integration
Real-World System Constraints
```

---

## Repository Visibility

The original implementation is not currently published as part of this portfolio. This page provides a concise technical summary of the project and its engineering focus.

---

[← Back to Amir Sarhadi's GitHub profile](../README.md)
