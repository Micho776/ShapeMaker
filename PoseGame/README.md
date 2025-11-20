# SHAPEMAKER

A real-time pose-matching game that combines computer vision, 2D rendering, and AI commentary. Match poses shown by an illustrated character using your webcam while a local AI provides feedback on your performance.

## Features

- **Real-Time Pose Detection** - Uses TensorFlow.js MoveNet to track 17 body keypoints at 60+ FPS
- **2D Illustrated Character** - Target poses displayed with a polished, gradient-rendered 2D character
- **AI Commentary** - Local LLM (Ollama) generates personalized feedback and end-of-round analysis
- **Multiplayer Support** - Turn-based competition for 1-4 players with player badges
- **Strict Hold-to-Confirm Mechanic** - Lock-on system requires holding poses accurately for 1.5 seconds
- **14 Unique Poses** - No repeats until all poses are completed
- **Dynamic Scoring** - Points awarded based on speed and accuracy
- **Built-in Audio** - Procedural sound engine, no external audio files needed

## Project Structure

```bash
PoseGame/
├── index.html       # Main application entry point
├── style.css        # UI styling and animations
├── script.js        # Game logic, 2D rendering, and pose detection
├── poses.js         # Pose coordinate database (14 poses)
├── audio.js         # Procedural audio synthesizer
└── assets/
    └── character.glb    # (Legacy 3D model, not used in current version)
```

## Prerequisites

- **Modern Browser** - Chrome, Edge, or Brave (WebGL and camera support required)
- **Webcam** - For pose detection
- **Ollama** - For AI commentary ([Download here](https://ollama.ai))
- **Local Server** - VS Code Live Server extension or similar

## Setup

### 1. Configure Ollama (for AI features)

**Windows (PowerShell):**

```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

**Mac/Linux:**

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Download the required model:

```bash
ollama pull llama3.2
```

> **Note:** Keep the Ollama terminal window open while playing

### 2. Launch the Game

1. Open the project folder in VS Code
2. Right-click `index.html`
3. Select **"Open with Live Server"**
4. Allow camera access when prompted

## How to Play

1. **Choose Mode** - Select Solo, Duo, Trio, or Squad (1-4 players)
2. **Position Yourself** - Stand back so your full body is visible in the camera feed
3. **Match the Pose** - Replicate the pose shown by the illustrated character
4. **Hold to Confirm** - Keep the pose steady for 1.5 seconds to fill the lock-on bar
5. **Score Points** - Faster and more accurate matches earn more points
6. **Complete All Poses** - No pose repeats until you've done all 14!
7. **AI Feedback** - Receive commentary at the end of each round

## Configuration

Edit `CONF` object in `script.js` to customize:

```javascript
const CONF = {
  BASE_THRESHOLD: 0.2, // Pose matching strictness (lower = stricter)
  MIN_CONFIDENCE: 0.3, // Minimum pose detection confidence
  ROUND_TIME: 60, // Seconds per round
  HOLD_DURATION_FRAMES: 45, // Frames to hold pose (~1.5 seconds at 30fps)
  AI_MODEL: "llama3.2", // Ollama model name
};
```

## Included Poses (14 Total)

1. **T-POSE** - Classic calibration pose
2. **VICTORY** - V-shape arms overhead
3. **THE BOLT** - Diagonal arms (Usain Bolt style)
4. **BOXER** - Guard up, hands near face
5. **THE CRANE** - One leg raised, arms out (Karate Kid)
6. **PHARAOH** - Egyptian hands (one up, one forward)
7. **ARCHER** - Drawing a bow
8. **STAR** - Arms and legs spread wide
9. **X-FACTOR** - Arms crossed on chest
10. **SUPERHERO** - One fist up, one on hip
11. **DAB** - One arm across face, one extended
12. **TREE POSE** - Yoga tree with hands above head
13. **THINKING** - Hand on chin, other on hip
14. **JUMPING JACK** - Wide stance, arms up and out

## Troubleshooting

### AI not responding

- Verify Ollama is running with CORS enabled (`OLLAMA_ORIGINS="*"`)
- Ensure `llama3.2` model is downloaded: `ollama pull llama3.2`

### Poses matching too easily/strictly

- Adjust `BASE_THRESHOLD` in `script.js`:
  - **0.15** = Very strict (expert mode)
  - **0.20** = Strict (default)
  - **0.30** = Moderate
  - **0.40** = Lenient
- Adjust `HOLD_DURATION_FRAMES`:
  - **30** = 1 second hold
  - **45** = 1.5 seconds (default)
  - **60** = 2 seconds

### Camera not working

- Grant camera permissions in browser settings
- Ensure no other application is using the webcam
- Try a different browser if issues persist

### Performance issues

- Close other browser tabs
- Ensure good lighting for better pose detection
- Stand further back from camera for full body visibility

## Technologies

- [TensorFlow.js](https://www.tensorflow.org/js) - MoveNet pose detection
- [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - 2D character rendering
- [Ollama](https://ollama.ai) - Local LLM for AI commentary
- [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) - Celebration effects

## Game Mechanics

### Pose Pool System

- All 14 poses must be completed before any pose repeats
- Random selection from remaining poses
- Pool resets automatically after completing all poses
- Progress shown in console: "Pose 5/14: DAB"

### Scoring

- Points awarded for successful pose matches
- Faster matches = higher scores
- Accuracy required: poses must be held steadily

### Visual Feedback

- **Lock-on bar** - Shows hold progress (0-100%)
- **Success popup** - "PERFECT!" when pose confirmed
- **Warning popup** - "TOO FAR!" when pose breaks
- **2D character** - Shows target pose with gradients and shadows

## License

This project is provided as-is for educational and entertainment purposes.
