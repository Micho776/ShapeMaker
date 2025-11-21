// --- POSE DATABASE ---
const POSES = [
    // 1. T-POSE (Calibration)
    { name: "T-POSE", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.5,y:-0.35},{name:"right_elbow",x:-0.5,y:-0.35},{name:"left_wrist",x:0.75,y:-0.35},{name:"right_wrist",x:-0.75,y:-0.35},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 2. VICTORY (V-Shape Arms)
    { name: "VICTORY", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.2,y:-0.35},{name:"right_shoulder",x:-0.2,y:-0.35},{name:"left_elbow",x:0.35,y:-0.55},{name:"right_elbow",x:-0.35,y:-0.55},{name:"left_wrist",x:0.45,y:-0.75},{name:"right_wrist",x:-0.45,y:-0.75},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 3. BOXER (Guard Up - Hands near face)
    { name: "BOXER", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.2,y:-0.2},{name:"right_elbow",x:-0.2,y:-0.2},{name:"left_wrist",x:0.1,y:-0.45},{name:"right_wrist",x:-0.1,y:-0.45},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 5. THE CRANE (One leg up)
    { name: "THE CRANE", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.4,y:-0.3},{name:"right_elbow",x:-0.4,y:-0.3},{name:"left_wrist",x:0.6,y:-0.4},{name:"right_wrist",x:-0.6,y:-0.4},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.3,y:0.3},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.5}]},
    
    // 6. PHARAOH (Egyptian Hands - One up, one down/forward)
    { name: "PHARAOH", points: [{name:"nose",x:-0.1,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.4,y:-0.5},{name:"right_elbow",x:-0.4,y:-0.2},{name:"left_wrist",x:0.2,y:-0.5},{name:"right_wrist",x:-0.2,y:-0.2},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 7. ARCHER (Drawing Bow - Asymmetrical)
    { name: "ARCHER", points: [{name:"nose",x:0.1,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.5,y:-0.35},{name:"right_elbow",x:-0.3,y:-0.35},{name:"left_wrist",x:0.8,y:-0.35},{name:"right_wrist",x:0.1,y:-0.35},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 8. STAR (Arms up, legs wide)
    { name: "STAR", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.5,y:-0.5},{name:"right_elbow",x:-0.5,y:-0.5},{name:"left_wrist",x:0.7,y:-0.65},{name:"right_wrist",x:-0.7,y:-0.65},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.25,y:0.4},{name:"right_knee",x:-0.25,y:0.4},{name:"left_ankle",x:0.4,y:0.75},{name:"right_ankle",x:-0.4,y:0.75}]},
    
    // 9. X-FACTOR (Arms Crossed on chest)
    { name: "X-FACTOR", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.15,y:-0.5},{name:"right_elbow",x:-0.15,y:-0.5},{name:"left_wrist",x:-0.2,y:-0.75},{name:"right_wrist",x:0.2,y:-0.75},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 10. SUPERHERO (One fist up, one on hip)
    { name: "SUPERHERO", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.3,y:-0.6},{name:"right_elbow",x:-0.25,y:-0.1},{name:"left_wrist",x:0.25,y:-0.85},{name:"right_wrist",x:-0.15,y:0.05},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 11. DAB (One arm across face, one extended)
    { name: "DAB", points: [{name:"nose",x:0.1,y:-0.5},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.15,y:-0.5},{name:"right_elbow",x:-0.5,y:-0.4},{name:"left_wrist",x:0.05,y:-0.6},{name:"right_wrist",x:-0.8,y:-0.5},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 12. TREE POSE (Arms up, one leg on other knee)
    { name: "TREE POSE", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.35,y:-0.6},{name:"right_elbow",x:-0.35,y:-0.6},{name:"left_wrist",x:0.15,y:-0.8},{name:"right_wrist",x:-0.15,y:-0.8},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.35,y:0.25},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.25,y:0.3}]},
    
    // 13. THINKING (Hand on chin, other on hip)
    { name: "THINKING", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.2,y:-0.2},{name:"right_elbow",x:-0.25,y:-0.1},{name:"left_wrist",x:0.05,y:-0.45},{name:"right_wrist",x:-0.15,y:0.05},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.15,y:0.5},{name:"right_knee",x:-0.15,y:0.5},{name:"left_ankle",x:0.15,y:0.85},{name:"right_ankle",x:-0.15,y:0.85}]},
    
    // 14. JUMPING JACK (Wide stance, arms up and out)
    { name: "JUMPING JACK", points: [{name:"nose",x:0,y:-0.55},{name:"left_shoulder",x:0.25,y:-0.35},{name:"right_shoulder",x:-0.25,y:-0.35},{name:"left_elbow",x:0.5,y:-0.55},{name:"right_elbow",x:-0.5,y:-0.55},{name:"left_wrist",x:0.65,y:-0.75},{name:"right_wrist",x:-0.65,y:-0.75},{name:"left_hip",x:0.15,y:0.15},{name:"right_hip",x:-0.15,y:0.15},{name:"left_knee",x:0.3,y:0.45},{name:"right_knee",x:-0.3,y:0.45},{name:"left_ankle",x:0.45,y:0.8},{name:"right_ankle",x:-0.45,y:0.8}]}
];