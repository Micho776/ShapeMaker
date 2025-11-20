// --- CONFIGURATION ---
const CONF = {
    BASE_THRESHOLD: 0.20, // Stricter pose matching (lower = more strict)
    MIN_CONFIDENCE: 0.3, // Higher confidence required
    ROUND_TIME: 60, 
    HOLD_DURATION_FRAMES: 45, // Increased from 25 to 45 (1.5 seconds at 30fps)
    AI_MODEL: "llama3.2", 
    AI_URL: "http://localhost:11434/api/generate",
    MODEL_PATH: './assets/character.glb' 
};

// --- POSE LIBRARY (CALIBRATED ROTATIONS) ---
const POSE_LIBRARY = {
    "T-POSE": {},
    "VICTORY": { mixamorigRightArm: {z: 2.5}, mixamorigLeftArm: {z: -2.5}, mixamorigRightForeArm: {z: 0.1}, mixamorigLeftForeArm: {z: -0.1} },
    "THE BOLT": { mixamorigRightArm: {z: 0.5, y: -1.0}, mixamorigRightForeArm: {z: 0}, mixamorigLeftArm: {z: -1.0, y: 1.0}, mixamorigLeftForeArm: {z: -2.0} },
    "BOXER": { mixamorigRightArm: {z: 1.0, x: 0.5}, mixamorigRightForeArm: {x: -2.0}, mixamorigLeftArm: {z: -1.0, x: 0.5}, mixamorigLeftForeArm: {x: -2.0} },
    "THE CRANE": { mixamorigRightArm: {z: 1.0}, mixamorigLeftArm: {z: -1.0}, mixamorigRightUpLeg: {x: -1.5}, mixamorigRightLeg: {x: 1.5} },
    "PHARAOH": { mixamorigRightArm: {z: 1.57, x: 0.5}, mixamorigRightForeArm: {x: -1.57}, mixamorigLeftArm: {z: -1.57, x: 0.5}, mixamorigLeftForeArm: {x: -1.57} },
    "ARCHER": { mixamorigRightArm: {z: 1.57}, mixamorigRightForeArm: {x: -2.5}, mixamorigLeftArm: {z: -1.57}, mixamorigLeftForeArm: {x: 0} },
    "STAR": { mixamorigRightArm: {z: 1.0}, mixamorigLeftArm: {z: -1.0}, mixamorigRightUpLeg: {z: 0.5}, mixamorigLeftUpLeg: {z: -0.5} },
    "X-FACTOR": { mixamorigRightArm: {z: 0.5, x: 1.0}, mixamorigRightForeArm: {x: -2.5}, mixamorigLeftArm: {z: -0.5, x: 1.0}, mixamorigLeftForeArm: {x: -2.5} }
};

let game = {
    detector: null, totalPlayers: 1, currentPlayerIdx: 0, 
    scores: [], roundTime: CONF.ROUND_TIME, timerInt: null, isPlaying: false, 
    rafId: null, targetPose: null, cooldown: false, holdCounter: 0, poseStartTime: 0,
    sessionLog: [], lastPoseIdx: -1, usedPoses: [] 
};

const els = {
    screens: { loading: document.getElementById('screen-loading'), menu: document.getElementById('screen-menu'), turn: document.getElementById('screen-turn'), results: document.getElementById('screen-results'), game: document.getElementById('game-ui') },
    hud: { player: document.getElementById('hud-player'), score: document.getElementById('hud-score'), time: document.getElementById('hud-time') },
    game: { video: document.getElementById('webcam'), success: document.getElementById('success-popup'), warn: document.getElementById('warning-popup'), lock: document.getElementById('lock-overlay'), lockFill: document.getElementById('lock-fill'), lockNum: document.getElementById('lock-percent'), poseLabel: document.getElementById('pose-name-label'), targetContainer: document.getElementById('target-three-container'), turnContainer: document.getElementById('turn-three-container') },
    report: document.getElementById('ai-report-box')
};

// --- CLEANUP & FINDER FUNCTIONS ---
function cleanOldCanvases() {
    const oldTarg = document.getElementById('targetCanvas');
    const oldLive = document.getElementById('liveCanvas');
    if(oldTarg) oldTarg.remove();
    if(oldLive) oldLive.remove();
}

function getBone(model, name) {
    let found = null;
    // Try exact name first
    found = model.getObjectByName(name);
    if(found) return found;
    // Try with mixamorig prefix
    found = model.getObjectByName("mixamorig" + name);
    if(found) return found;
    // Fallback: search by name ending
    model.traverse((node) => {
        if (found) return;
        if (node.isBone && node.name.toLowerCase().endsWith(name.toLowerCase())) found = node;
    });
    return found;
}

function fitCameraToModel(camera, object, offsetZ = 1.5) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Center the model at origin
    object.position.x -= center.x;
    object.position.y -= center.y;
    object.position.z -= center.z;
    
    // Adjust vertical position (move up slightly to show full body)
    object.position.y -= (size.y * 0.05); 
    
    // Calculate camera distance
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(size.y / 2 / Math.tan(fov / 2));
    cameraZ *= offsetZ; 
    
    camera.position.set(0, size.y * 0.1, cameraZ);
    camera.lookAt(0, size.y * 0.1, 0);
    
    console.log("Model positioned:", object.position, "Camera at:", camera.position, "Size:", size);
}

// --- TARGET 2D CANVAS ---
const TargetEngine = {
    canvas: null, ctx: null, initialized: false, pendingPose: null,
    init: function() {
        if(this.initialized) return;
        this.initialized = true;
        
        if(els.game.targetContainer) {
            els.game.targetContainer.innerHTML = '';
            this.canvas = document.createElement('canvas');
            this.canvas.width = 800;
            this.canvas.height = 800;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.display = 'block';
            els.game.targetContainer.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            console.log("2D Target Canvas initialized");
            
            if(this.pendingPose) this.setPose(this.pendingPose);
        }
    },
    setPose: function(poseName) {
        if(!this.ctx) { this.pendingPose = poseName; return; }
        
        const pose = POSES.find(p => p.name === poseName);
        if(!pose) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#f0f4f8';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stick figure
        this.drawStickFigure(pose.points);
        
        // Draw pose name at bottom
        this.ctx.fillStyle = '#4F46E5';
        this.ctx.font = 'bold 36px Orbitron, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(poseName, this.canvas.width / 2, this.canvas.height - 30);
    },
    drawStickFigure: function(points) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const scale = 300;
        const offsetX = w / 2;
        const offsetY = h / 2;
        
        // Convert normalized coords to canvas coords
        const keypoints = {};
        points.forEach(p => {
            keypoints[p.name] = {
                x: offsetX + (p.x * scale),
                y: offsetY + (p.y * scale)
            };
        });
        
        const ctx = this.ctx;
        
        // Function to draw limb with gradient and shadow
        const drawLimb = (start, end, width, colorStart, colorEnd) => {
            if(!keypoints[start] || !keypoints[end]) return;
            
            const dx = keypoints[end].x - keypoints[start].x;
            const dy = keypoints[end].y - keypoints[start].y;
            const angle = Math.atan2(dy, dx);
            const length = Math.sqrt(dx*dx + dy*dy);
            
            ctx.save();
            ctx.translate(keypoints[start].x, keypoints[start].y);
            ctx.rotate(angle);
            
            // Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
            // Gradient fill
            const gradient = ctx.createLinearGradient(0, -width/2, 0, width/2);
            gradient.addColorStop(0, colorStart);
            gradient.addColorStop(0.5, colorEnd);
            gradient.addColorStop(1, colorStart);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(0, -width/2, length, width, width/2);
            ctx.fill();
            
            // Highlight
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.roundRect(2, -width/2 + 2, length - 4, width/3, width/4);
            ctx.fill();
            
            ctx.restore();
        };
        
        // Draw shadow under character
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        const shadowY = offsetY + scale * 0.9;
        ctx.ellipse(offsetX, shadowY, 60, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Draw torso with gradient
        if(keypoints['left_shoulder'] && keypoints['right_shoulder'] && keypoints['left_hip'] && keypoints['right_hip']) {
            // Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;
            
            // Torso gradient
            const torsoGradient = ctx.createLinearGradient(
                keypoints['left_shoulder'].x, keypoints['left_shoulder'].y,
                keypoints['right_shoulder'].x, keypoints['right_shoulder'].y
            );
            torsoGradient.addColorStop(0, '#8B5CF6');
            torsoGradient.addColorStop(0.5, '#6366F1');
            torsoGradient.addColorStop(1, '#8B5CF6');
            
            ctx.fillStyle = torsoGradient;
            ctx.beginPath();
            ctx.moveTo(keypoints['left_shoulder'].x, keypoints['left_shoulder'].y);
            ctx.lineTo(keypoints['right_shoulder'].x, keypoints['right_shoulder'].y);
            ctx.lineTo(keypoints['right_hip'].x, keypoints['right_hip'].y);
            ctx.lineTo(keypoints['left_hip'].x, keypoints['left_hip'].y);
            ctx.closePath();
            ctx.fill();
            
            // Torso highlight
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(keypoints['left_shoulder'].x + 5, keypoints['left_shoulder'].y + 5);
            ctx.lineTo(keypoints['right_shoulder'].x - 5, keypoints['right_shoulder'].y + 5);
            ctx.lineTo(keypoints['right_hip'].x - 5, keypoints['right_hip'].y - 5);
            ctx.lineTo(keypoints['left_hip'].x + 5, keypoints['left_hip'].y - 5);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.shadowColor = 'transparent';
        
        // Draw limbs with gradients
        // Legs (darker)
        drawLimb('left_hip', 'left_knee', 28, '#6366F1', '#4F46E5');
        drawLimb('left_knee', 'left_ankle', 24, '#818CF8', '#6366F1');
        drawLimb('right_hip', 'right_knee', 28, '#6366F1', '#4F46E5');
        drawLimb('right_knee', 'right_ankle', 24, '#818CF8', '#6366F1');
        
        // Arms (lighter)
        drawLimb('left_shoulder', 'left_elbow', 22, '#A5B4FC', '#818CF8');
        drawLimb('left_elbow', 'left_wrist', 18, '#C7D2FE', '#A5B4FC');
        drawLimb('right_shoulder', 'right_elbow', 22, '#A5B4FC', '#818CF8');
        drawLimb('right_elbow', 'right_wrist', 18, '#C7D2FE', '#A5B4FC');
        
        // Head with detailed features
        if(keypoints['nose']) {
            const headRadius = 40;
            const headX = keypoints['nose'].x;
            const headY = keypoints['nose'].y;
            
            // Head shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;
            
            // Head gradient
            const headGradient = ctx.createRadialGradient(
                headX - 10, headY - 10, 5,
                headX, headY, headRadius
            );
            headGradient.addColorStop(0, '#EEF2FF');
            headGradient.addColorStop(0.7, '#DDD6FE');
            headGradient.addColorStop(1, '#C7D2FE');
            
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            
            // Face features
            ctx.fillStyle = '#4F46E5';
            // Eyes
            ctx.beginPath();
            ctx.arc(headX - 12, headY - 8, 4, 0, Math.PI * 2);
            ctx.arc(headX + 12, headY - 8, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye highlights
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(headX - 10, headY - 10, 2, 0, Math.PI * 2);
            ctx.arc(headX + 14, headY - 10, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Smile
            ctx.strokeStyle = '#4F46E5';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(headX, headY + 8, 15, 0.3, Math.PI - 0.3);
            ctx.stroke();
            
            // Nose
            ctx.fillStyle = '#818CF8';
            ctx.beginPath();
            ctx.ellipse(headX, headY, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Joint circles with depth
        const drawJoint = (joint, size) => {
            if(!keypoints[joint]) return;
            
            const x = keypoints[joint].x;
            const y = keypoints[joint].y;
            
            // Joint shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // Joint gradient
            const jointGradient = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, size);
            jointGradient.addColorStop(0, '#818CF8');
            jointGradient.addColorStop(1, '#4F46E5');
            
            ctx.fillStyle = jointGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            
            // Joint highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(x - 2, y - 2, size/2.5, 0, Math.PI * 2);
            ctx.fill();
        };
        
        // Draw all joints
        ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 
         'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
         'left_knee', 'right_knee', 'left_ankle', 'right_ankle'].forEach(joint => {
            drawJoint(joint, 11);
        });
    },
    render: function() { /* Not needed for 2D canvas */ }
};

// --- TURN SCREEN PLAYER BADGE ---
const TurnEngine = {
    canvas: null, ctx: null, initialized: false,
    init: function() {
        if(this.initialized) return;
        this.initialized = true;
        
        if(els.game.turnContainer) {
            els.game.turnContainer.innerHTML = '';
            this.canvas = document.createElement('canvas');
            this.canvas.width = 400;
            this.canvas.height = 500;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            els.game.turnContainer.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            this.drawPlayerBadge();
            console.log("Player badge initialized");
        }
    },
    drawPlayerBadge: function() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear background
        ctx.fillStyle = '#E0E7FF';
        ctx.fillRect(0, 0, w, h);
        
        // Draw large circular avatar
        const centerX = w / 2;
        const centerY = h / 2 - 30;
        const avatarRadius = 120;
        
        // Avatar shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        // Avatar circle gradient (yellow theme)
        const avatarGradient = ctx.createRadialGradient(
            centerX - 30, centerY - 30, 20,
            centerX, centerY, avatarRadius
        );
        avatarGradient.addColorStop(0, '#FCD34D');
        avatarGradient.addColorStop(1, '#F59E0B');
        
        ctx.fillStyle = avatarGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, avatarRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        
        // Simple person silhouette
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        
        // Head
        ctx.beginPath();
        ctx.arc(centerX, centerY - 30, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Neck
        ctx.fillRect(centerX - 8, centerY - 5, 16, 15);
        
        // Torso
        ctx.beginPath();
        ctx.moveTo(centerX - 40, centerY + 10);
        ctx.lineTo(centerX + 40, centerY + 10);
        ctx.lineTo(centerX + 35, centerY + 70);
        ctx.lineTo(centerX - 35, centerY + 70);
        ctx.closePath();
        ctx.fill();
        
        // Arms
        ctx.beginPath();
        ctx.moveTo(centerX - 40, centerY + 10);
        ctx.lineTo(centerX - 50, centerY + 50);
        ctx.lineTo(centerX - 45, centerY + 55);
        ctx.lineTo(centerX - 35, centerY + 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 40, centerY + 10);
        ctx.lineTo(centerX + 50, centerY + 50);
        ctx.lineTo(centerX + 45, centerY + 55);
        ctx.lineTo(centerX + 35, centerY + 15);
        ctx.closePath();
        ctx.fill();
        
        // Legs
        ctx.beginPath();
        ctx.moveTo(centerX - 25, centerY + 70);
        ctx.lineTo(centerX - 30, centerY + 100);
        ctx.lineTo(centerX - 20, centerY + 100);
        ctx.lineTo(centerX - 15, centerY + 70);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 15, centerY + 70);
        ctx.lineTo(centerX + 20, centerY + 100);
        ctx.lineTo(centerX + 30, centerY + 100);
        ctx.lineTo(centerX + 25, centerY + 70);
        ctx.closePath();
        ctx.fill();
        
        // Player number in center
        const playerNum = game.currentPlayerIdx + 1;
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 40px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${playerNum}`, centerX, centerY + 35);
        
        // Player label above
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 32px Orbitron, sans-serif';
        ctx.fillText(`PLAYER ${playerNum}`, centerX, 50);
        
        // Status below
        ctx.fillStyle = '#D97706';
        ctx.font = '24px Nunito, sans-serif';
        ctx.fillText('READY', centerX, h - 100);
        
        // Score display
        const currentScore = game.scores[game.currentPlayerIdx] || 0;
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 28px Orbitron, sans-serif';
        ctx.fillText(`SCORE: ${currentScore}`, centerX, h - 50);
    },
    render: function() { /* Static badge, no animation needed */ }
};


// --- MAIN LOGIC ---
async function init() {
    cleanOldCanvases(); 
    try {
        const bar = document.querySelector('.loading-bar-fill');
        const status = document.getElementById('load-text');
        const loadingScreen = document.getElementById('screen-loading');
        const menuScreen = document.getElementById('screen-menu');
        let pct = 0;
        const fakeLoad = setInterval(() => { pct += 10; if(pct>100) pct=100; if(bar) bar.style.width = pct+"%"; }, 100);

        status.innerText = "INITIALIZING CAMERA..."; await setupCamera();
        status.innerText = "LOADING ENGINES..."; await tf.ready();
        game.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING });
        
        TargetEngine.init();
        TurnEngine.init();

        clearInterval(fakeLoad); if(bar) bar.style.width = "100%"; status.innerText = "SYSTEM READY.";
        
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => { loadingScreen.style.display = 'none'; menuScreen.classList.remove('hidden'); menuScreen.classList.add('menu-fade-in'); }, 1000);
        }, 800);

    } catch (e) { console.error(e); alert("Error: " + e.message); }
}

async function setupCamera() {
    const constraints = { video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' } }; 
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    els.game.video.srcObject = stream;
    return new Promise(r => els.game.video.onloadedmetadata = () => { els.game.video.play(); r(); });
}

function setupGame(n) { game.totalPlayers = n; game.scores = new Array(n).fill(0); game.currentPlayerIdx = 0; showTurnScreen(); }
function showTurnScreen() { 
    document.getElementById('turn-title').innerText = `PLAYER ${game.currentPlayerIdx + 1}`; 
    showScreen('turn'); 
}
function showScreen(name) { 
    ['screen-menu', 'screen-turn', 'screen-results'].forEach(id => document.getElementById(id).classList.add('hidden'));
    if(name === 'game') els.screens.game.classList.remove('hidden');
    else { els.screens.game.classList.add('hidden'); if(name) document.getElementById(`screen-${name}`).classList.remove('hidden'); }
}

function startRound() {
    showScreen('game'); if(AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume(); AudioEngine.startMusic();
    game.roundTime = CONF.ROUND_TIME; game.isPlaying = true; game.holdCounter = 0; game.sessionLog = [];
    els.hud.player.innerText = `P${game.currentPlayerIdx + 1}`; els.hud.score.innerText = "0"; els.hud.time.innerText = game.roundTime;
    AudioEngine.playSuccess(); nextPose();
    if (game.timerInt) clearInterval(game.timerInt);
    game.timerInt = setInterval(() => { game.roundTime--; els.hud.time.innerText = game.roundTime; if (game.roundTime <= 0) endRound(); }, 1000);
    loop();
}

function endRound() {
    game.isPlaying = false; clearInterval(game.timerInt); cancelAnimationFrame(game.rafId);
    game.scores[game.currentPlayerIdx] = parseInt(els.hud.score.innerText);
    if (game.currentPlayerIdx < game.totalPlayers - 1) { game.currentPlayerIdx++; showTurnScreen(); } else { showResults(); }
}

function showResults() {
    showScreen('results');
    const list = document.getElementById('results-list'); list.innerHTML = '';
    let maxScore = -1; let winners = [];
    game.scores.forEach((s, i) => { if(s > maxScore) { maxScore = s; winners = [i+1]; } else if(s === maxScore) { winners.push(i+1); } });
    game.scores.forEach((score, i) => { 
        const div = document.createElement('div'); div.className = 'result-row';
        div.innerHTML = `<span>PLAYER ${i+1}</span> <span>${score} PTS</span>`;
        if(winners.includes(i+1)) div.style.color = "var(--primary)";
        list.appendChild(div);
    });
    generateDebrief(winners[0] || 1);
}

function resetGame() { showScreen('menu'); }

function nextPose() {
    // Reset used poses if all have been completed
    if (game.usedPoses.length >= POSES.length) {
        game.usedPoses = [];
        console.log("All poses completed! Resetting pose pool.");
    }
    
    // Pick a random unused pose
    let availablePoses = POSES.filter((p, idx) => !game.usedPoses.includes(idx));
    let randomPose = availablePoses[Math.floor(Math.random() * availablePoses.length)];
    let idx = POSES.indexOf(randomPose);
    
    game.usedPoses.push(idx);
    game.lastPoseIdx = idx; 
    game.targetPose = POSES[idx]; 
    game.holdCounter = 0; 
    game.poseStartTime = Date.now();
    
    console.log(`Pose ${game.usedPoses.length}/${POSES.length}:`, randomPose.name);
    els.game.poseLabel.innerText = game.targetPose.name;
    els.game.lock.style.display = 'block'; els.game.lockFill.style.width = "0%"; els.game.lockNum.innerText = "0%";
    TargetEngine.setPose(game.targetPose.name);
}

async function generateDebrief(playerIdx) {
    const reportEl = els.report; reportEl.innerText = "GENERATING REPORT...";
    const totalPoses = game.sessionLog.length;
    let prompt; if(totalPoses === 0) prompt = `ROLE: Esports Caster. DATA: P${playerIdx} scored 0. TASK: Roast them.`; else { const avgTime = game.sessionLog.reduce((a,b) => a + b.time, 0) / totalPoses; prompt = `ROLE: Esports Caster. DATA: P${playerIdx}, ${totalPoses} matches, Avg ${avgTime.toFixed(1)}s. TASK: 1 sentence review.`; }
    try {
        const response = await fetch(CONF.AI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: CONF.AI_MODEL, prompt: prompt, stream: false }) });
        const data = await response.json(); const text = data.response.replace(/\*\*/g, '').trim();
        reportEl.innerText = text; const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 1.1; window.speechSynthesis.speak(u);
    } catch (e) { reportEl.innerText = "AI OFFLINE."; }
}

async function loop() {
    if (!game.isPlaying) return;
    game.rafId = requestAnimationFrame(loop);
    const poses = await game.detector.estimatePoses(els.game.video);
    if (poses.length > 0) {
        const kp = poses[0].keypoints; 
        const normLive = normalizePose(kp);
        const diff = comparePosesWeighted(normLive, game.targetPose.points);
        let matchQuality = Math.max(0, (CONF.BASE_THRESHOLD - diff) / CONF.BASE_THRESHOLD);
        let percent = Math.floor(matchQuality * 100); if(percent < 0) percent = 0;
        if (diff < CONF.BASE_THRESHOLD) {
            game.holdCounter++;
            const lockProgress = Math.min(100, (game.holdCounter / CONF.HOLD_DURATION_FRAMES) * 100);
            els.game.lockFill.style.width = lockProgress + "%"; els.game.lockNum.innerText = percent + "% MATCH";
            if (game.holdCounter >= CONF.HOLD_DURATION_FRAMES) { handleSuccess(); }
        } else {
            game.holdCounter = Math.max(0, game.holdCounter - 2);
            const pct = (game.holdCounter / CONF.HOLD_DURATION_FRAMES * 100);
            els.game.lockFill.style.width = pct + "%"; els.game.lockNum.innerText = percent + "%"; 
        }
    }
}

function handleSuccess() {
    if(game.cooldown) return; game.cooldown = true; game.holdCounter = 0;
    const timeTaken = (Date.now() - game.poseStartTime) / 1000;
    game.sessionLog.push({ name: game.targetPose.name, time: timeTaken });
    triggerConfetti(); AudioEngine.playSuccess();
    let currentScore = parseInt(els.hud.score.innerText); els.hud.score.innerText = currentScore + 1;
    els.game.success.style.opacity = 1; els.game.success.classList.add('pop-anim');
    setTimeout(() => { els.game.success.style.opacity = 0; els.game.success.classList.remove('pop-anim'); }, 1000);
    setTimeout(() => { game.cooldown = false; if(game.isPlaying) nextPose(); }, 1500);
}

function triggerConfetti() { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ffeb3b', '#0078ff', '#ff0055'] }); }
function normalizePose(kp) { const k = {}; kp.forEach(p => k[p.name] = p); if(!k['left_hip'] || !k['right_hip'] || !k['left_shoulder']) return []; const cx = (k['left_hip'].x + k['right_hip'].x) / 2; const cy = (k['left_hip'].y + k['right_hip'].y) / 2; const shy = (k['left_shoulder'].y + k['right_shoulder'].y) / 2; const size = Math.abs(cy - shy) * 2.5 || 100; return kp.map(p => ({ name: p.name, x: (p.x - cx) / size, y: (p.y - cy) / size, score: p.score })); }
function comparePosesWeighted(live, target) { if(!live.length) return 100; const weights = { 'left_wrist': 5.0, 'right_wrist': 5.0, 'left_ankle': 4.0, 'right_ankle': 4.0, 'left_elbow': 2.0, 'right_elbow': 2.0, 'left_knee': 2.0, 'right_knee': 2.0, 'left_shoulder': 0.5, 'right_shoulder': 0.5, 'left_hip': 0.5, 'right_hip': 0.5 }; let totalDist = 0; let totalWeight = 0; target.forEach(tPoint => { const lPoint = live.find(p => p.name === tPoint.name); if (lPoint) { const d = Math.hypot(lPoint.x - tPoint.x, lPoint.y - tPoint.y); const w = weights[tPoint.name] || 1.0; totalDist += d * w; totalWeight += w; } }); return totalWeight > 0 ? totalDist / totalWeight : 100; }

window.onload = init;