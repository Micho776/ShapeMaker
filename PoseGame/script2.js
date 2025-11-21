// --- CONFIGURATION ---
const CONF = {
    BASE_THRESHOLD: 0.25,
    MIN_CONFIDENCE: 0.25,
    ROUND_TIME: 60,
    HOLD_DURATION_FRAMES: 30,
    AI_MODEL: "llama3.2",
    AI_URL: "http://localhost:11434/api/generate",
    SMOOTHING: 0.8
};

let game = {
    detector: null, totalPlayers: 1, currentPlayerIdx: 0,
    scores: [], roundTime: CONF.ROUND_TIME, timerInt: null, isPlaying: false,
    rafId: null, targetPose: null, cooldown: false, holdCounter: 0, poseStartTime: 0,
    sessionLog: [], lastPoseIdx: -1, usedPoses: [],
    lastKeypoints: null,
    lastTickSound: 0 // Tracks last countdown tick
};

const els = {
    screens: { loading: document.getElementById('screen-loading'), menu: document.getElementById('screen-menu'), turn: document.getElementById('screen-turn'), results: document.getElementById('screen-results'), game: document.getElementById('game-ui') },
    hud: { player: document.getElementById('hud-player'), score: document.getElementById('hud-score'), time: document.getElementById('hud-time') },
    game: { 
        video: document.getElementById('webcam'), 
        overlay: document.getElementById('video-overlay'),
        targetCanvas: document.getElementById('target-canvas'),
        turnCanvas: document.getElementById('turn-canvas'),
        success: document.getElementById('success-popup'), 
        warn: document.getElementById('warn-popup'), 
        lock: document.getElementById('lock-overlay'), 
        lockFill: document.getElementById('lock-fill'), 
        lockNum: document.getElementById('lock-percent'), 
        poseLabel: document.getElementById('pose-name-label')
    },
    report: document.getElementById('ai-report-box')
};

// --- 3D BACKGROUND ENGINE ---
const BackgroundEngine = {
    scene: null, camera: null, renderer: null, blobs: [],
    init: function () {
        const container = document.createElement('div');
        container.id = 'bg-canvas';
        document.body.prepend(container);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 50;

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);

        const geometry = new THREE.IcosahedronGeometry(6, 1);
        const colors = [0x3B82F6, 0xF472B6, 0xF59E0B, 0x8B5CF6];

        for (let i = 0; i < 12; i++) {
            const material = new THREE.MeshPhongMaterial({
                color: colors[i % colors.length],
                shininess: 80,
                flatShading: true,
                transparent: true,
                opacity: 0.8
            });
            const blob = new THREE.Mesh(geometry, material);
            blob.position.set((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40);
            blob.userData = {
                rotX: (Math.random() - 0.5) * 0.02,
                rotY: (Math.random() - 0.5) * 0.02,
                floatSpeed: (Math.random() * 0.02) + 0.01,
                floatOffset: Math.random() * Math.PI * 2
            };
            this.scene.add(blob);
            this.blobs.push(blob);
        }

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        this.animate();
    },
    animate: function () {
        requestAnimationFrame(() => this.animate());
        const time = Date.now() * 0.001;
        this.blobs.forEach(blob => {
            blob.rotation.x += blob.userData.rotX;
            blob.rotation.y += blob.userData.rotY;
            blob.position.y += Math.sin(time + blob.userData.floatOffset) * blob.userData.floatSpeed;
        });
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

// --- 2D MANNEQUIN ENGINE ---
const MannequinEngine = {
    ctx: null,
    connections: [
        ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'], ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'], ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
    ],
    init: function() { this.resize(); window.addEventListener('resize', () => this.resize()); },
    resize: function() {
        [els.game.targetCanvas, els.game.turnCanvas, els.game.overlay].forEach(c => {
            if(c && c.parentElement) { c.width = c.parentElement.clientWidth; c.height = c.parentElement.clientHeight; }
        });
    },
    drawPose: function(canvas, points, colorTheme = "default") {
        if (!canvas || !points) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, scale = h * 0.45; 
        const getCoord = (pName) => {
            const pt = points.find(p => p.name === pName);
            return pt ? { x: cx + (pt.x * scale), y: cy + (pt.y * scale) } : null;
        };
        const colors = {
            default: { fill: '#3B82F6', stroke: '#60A5FA', glow: '#2563EB' },
            active: { fill: '#F59E0B', stroke: '#FCD34D', glow: '#D97706' },
            success: { fill: '#10B981', stroke: '#34D399', glow: '#059669' }
        };
        const theme = colors[colorTheme] || colors.default;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        this.connections.forEach(([start, end]) => {
            const p1 = getCoord(start), p2 = getCoord(end);
            if (p1 && p2) {
                ctx.shadowBlur = 15; ctx.shadowColor = theme.glow;
                const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                grad.addColorStop(0, theme.fill); grad.addColorStop(1, theme.stroke);
                ctx.strokeStyle = grad; ctx.lineWidth = 12; 
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
        });

        const nose = getCoord('nose');
        if (nose) {
            ctx.shadowBlur = 20; ctx.shadowColor = theme.glow; ctx.fillStyle = theme.fill;
            ctx.beginPath(); ctx.arc(nose.x, nose.y - (scale * 0.1), scale * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath(); ctx.rect(nose.x - (scale*0.08), nose.y - (scale*0.12), scale*0.16, scale*0.05); ctx.fill();
        }
    }
};

// --- MAIN LOGIC ---
async function init() {
    try {
        const bar = document.querySelector('.loading-bar-fill');
        const status = document.getElementById('load-text');
        
        AudioEngine.init(); // 1. Init Audio
        BackgroundEngine.init(); // 2. Init 3D

        let pct = 0;
        const fakeLoad = setInterval(() => { pct += 10; if(pct>100) pct=100; if(bar) bar.style.width = pct+"%"; }, 100);

        status.innerText = "INITIALIZING CAMERA..."; 
        await setupCamera();
        
        status.innerText = "LOADING AI MODELS..."; 
        await tf.ready();
        game.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { 
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING 
        });

        MannequinEngine.init();

        clearInterval(fakeLoad); 
        status.innerText = "SYSTEM READY.";
        
        setTimeout(() => {
            document.getElementById('screen-loading').style.display = 'none';
            document.getElementById('screen-menu').classList.remove('hidden');
        }, 500);

    } catch (e) { console.error(e); alert("Error: " + e.message); }
}

async function setupCamera() {
    const constraints = { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    els.game.video.srcObject = stream;
    return new Promise(r => els.game.video.onloadedmetadata = () => { els.game.video.play(); r(); });
}

function setupGame(n) { 
    AudioEngine.playClick();
    game.totalPlayers = n; 
    game.scores = new Array(n).fill(0); 
    game.currentPlayerIdx = 0; 
    showTurnScreen(); 
}

function showTurnScreen() {
    document.getElementById('turn-title').innerText = `PLAYER ${game.currentPlayerIdx + 1}`;
    showScreen('turn');
    setTimeout(() => { MannequinEngine.drawPose(els.game.turnCanvas, POSES[0].points, "active"); }, 100);
}

function showScreen(name) {
    ['screen-menu', 'screen-turn', 'screen-results'].forEach(id => document.getElementById(id).classList.add('hidden'));
    if (name === 'game') els.screens.game.classList.remove('hidden');
    else { els.screens.game.classList.add('hidden'); if (name) document.getElementById(`screen-${name}`).classList.remove('hidden'); }
}

function startRound() {
    AudioEngine.playClick();
    showScreen('game');
    
    if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
    AudioEngine.startMusic();

    game.roundTime = CONF.ROUND_TIME; game.isPlaying = true; game.holdCounter = 0; game.sessionLog = [];
    els.hud.player.innerText = `P${game.currentPlayerIdx + 1}`; els.hud.score.innerText = "0"; els.hud.time.innerText = game.roundTime;
    
    MannequinEngine.resize();
    nextPose();

    if (game.timerInt) clearInterval(game.timerInt);
    
    // --- UPDATED TIMER LOOP ---
    game.timerInt = setInterval(() => { 
        game.roundTime--; 
        els.hud.time.innerText = game.roundTime; 
        
        // SOUND: Tick every second
        if(game.roundTime > 0) {
            // Pass 'true' if urgent (10 seconds or less)
            const isUrgent = game.roundTime <= 10;
            AudioEngine.playCountdown(game.roundTime, isUrgent);
        }
        
        if (game.roundTime <= 0) endRound(); 
    }, 1000);
    
    loop();
}

function endRound() {
    game.isPlaying = false; clearInterval(game.timerInt); cancelAnimationFrame(game.rafId);
    game.scores[game.currentPlayerIdx] = parseInt(els.hud.score.innerText);
    if (game.currentPlayerIdx < game.totalPlayers - 1) { game.currentPlayerIdx++; showTurnScreen(); } else { showResults(); }
}

function showResults() {
    AudioEngine.playSuccess(); // End game fanfare
    showScreen('results');
    const list = document.getElementById('results-list'); list.innerHTML = '';
    let maxScore = -1; let winners = [];
    game.scores.forEach((s, i) => { if (s > maxScore) { maxScore = s; winners = [i + 1]; } else if (s === maxScore) { winners.push(i + 1); } });
    game.scores.forEach((score, i) => {
        const div = document.createElement('div'); div.className = 'result-row';
        div.innerHTML = `<span>PLAYER ${i + 1}</span> <span>${score} PTS</span>`;
        if (winners.includes(i + 1)) div.style.color = "var(--accent)";
        list.appendChild(div);
    });
    generateDebrief(winners[0] || 1);
}

function resetGame() { AudioEngine.playClick(); showScreen('menu'); }

function nextPose() {
    if (game.usedPoses.length >= POSES.length) { game.usedPoses = []; }
    let availablePoses = POSES.filter((p, idx) => !game.usedPoses.includes(idx));
    let randomPose = availablePoses[Math.floor(Math.random() * availablePoses.length)];
    let idx = POSES.indexOf(randomPose);

    game.usedPoses.push(idx);
    game.lastPoseIdx = idx;
    game.targetPose = POSES[idx];
    game.holdCounter = 0;
    game.poseStartTime = Date.now();

    els.game.poseLabel.innerText = game.targetPose.name;
    els.game.lock.style.display = 'block'; els.game.lockFill.style.width = "0%"; els.game.lockNum.innerText = "0%";
    
    MannequinEngine.drawPose(els.game.targetCanvas, game.targetPose.points, "default");
}

async function generateDebrief(playerIdx) {
    const reportEl = els.report; reportEl.innerText = "GENERATING REPORT...";
    const totalPoses = game.sessionLog.length;
    let prompt; if (totalPoses === 0) prompt = `ROLE: Esports Caster. DATA: P${playerIdx} scored 0. TASK: Roast them.`; else { const avgTime = game.sessionLog.reduce((a, b) => a + b.time, 0) / totalPoses; prompt = `ROLE: Esports Caster. DATA: P${playerIdx}, ${totalPoses} matches, Avg ${avgTime.toFixed(1)}s. TASK: 1 sentence review.`; }
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
    const ovCtx = els.game.overlay.getContext('2d');
    ovCtx.clearRect(0, 0, els.game.overlay.width, els.game.overlay.height);

    if (poses.length > 0) {
        let kp = poses[0].keypoints;
        if (game.lastKeypoints) {
            kp = kp.map((p, i) => {
                const prev = game.lastKeypoints[i];
                return { 
                    name: p.name, 
                    x: prev.x * (1 - CONF.SMOOTHING) + p.x * CONF.SMOOTHING, 
                    y: prev.y * (1 - CONF.SMOOTHING) + p.y * CONF.SMOOTHING, 
                    score: p.score 
                };
            });
        }
        game.lastKeypoints = kp;
        
        const normLive = normalizePose(kp);
        const diff = comparePosesWeighted(normLive, game.targetPose.points);
        
        let matchQuality = Math.max(0, (CONF.BASE_THRESHOLD - diff) / CONF.BASE_THRESHOLD);
        let percent = Math.floor(matchQuality * 100);

        if (diff < CONF.BASE_THRESHOLD) {
            MannequinEngine.drawPose(els.game.targetCanvas, game.targetPose.points, "success");
            
            game.holdCounter++;
            const lockProgress = Math.min(100, (game.holdCounter / CONF.HOLD_DURATION_FRAMES) * 100);
            els.game.lockFill.style.width = lockProgress + "%"; 
            els.game.lockNum.innerText = percent + "% MATCH";

            // SOUND: Play rising pitch sound every 5 frames while holding
            if(game.holdCounter % 5 === 0) {
                AudioEngine.playLockProgress(percent);
            }
            
            if (game.holdCounter >= CONF.HOLD_DURATION_FRAMES) { handleSuccess(); }
        } else {
            MannequinEngine.drawPose(els.game.targetCanvas, game.targetPose.points, "default");
            game.holdCounter = Math.max(0, game.holdCounter - 2);
            const pct = (game.holdCounter / CONF.HOLD_DURATION_FRAMES * 100);
            els.game.lockFill.style.width = pct + "%"; 
            els.game.lockNum.innerText = percent + "%";
        }
    }
}

function handleSuccess() {
    if (game.cooldown) return; game.cooldown = true; game.holdCounter = 0;
    const timeTaken = (Date.now() - game.poseStartTime) / 1000;
    game.sessionLog.push({ name: game.targetPose.name, time: timeTaken });
    
    // SOUND: Success sound
    AudioEngine.playSuccess();
    triggerConfetti(); 
    
    let currentScore = parseInt(els.hud.score.innerText); els.hud.score.innerText = currentScore + 1;
    els.game.success.style.opacity = 1; els.game.success.classList.add('pop-anim');
    setTimeout(() => { els.game.success.style.opacity = 0; els.game.success.classList.remove('pop-anim'); }, 1000);
    setTimeout(() => { game.cooldown = false; if (game.isPlaying) nextPose(); }, 1500);
}

function triggerConfetti() { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#3B82F6', '#F472B6', '#F59E0B'] }); }

function normalizePose(kp) { 
    const k = {}; kp.forEach(p => k[p.name] = p); 
    if (!k['left_hip'] || !k['right_hip'] || !k['left_shoulder'] || !k['right_shoulder']) return []; 
    const cx = (k['left_hip'].x + k['right_hip'].x) / 2; 
    const cy = (k['left_hip'].y + k['right_hip'].y) / 2; 
    const torsoH = Math.abs(cy - (k['left_shoulder'].y + k['right_shoulder'].y)/2);
    const shoulderW = Math.hypot(k['left_shoulder'].x - k['right_shoulder'].x, k['left_shoulder'].y - k['right_shoulder'].y);
    const size = (torsoH * 2.5 + shoulderW * 1.5) / 2 || 100; 
    return kp.map(p => ({ name: p.name, x: (p.x - cx) / size, y: (p.y - cy) / size, score: p.score })); 
}

function comparePosesWeighted(live, target) { 
    if (!live.length) return 100; 
    const weights = { 'left_wrist': 6.0, 'right_wrist': 6.0, 'left_ankle': 5.0, 'right_ankle': 5.0, 'left_elbow': 3.0, 'right_elbow': 3.0, 'left_knee': 3.0, 'right_knee': 3.0, 'left_shoulder': 1.0, 'right_shoulder': 1.0, 'left_hip': 1.0, 'right_hip': 1.0 }; 
    let totalDist = 0; let totalWeight = 0; 
    target.forEach(tPoint => { 
        const lPoint = live.find(p => p.name === tPoint.name); 
        if (lPoint && lPoint.score > CONF.MIN_CONFIDENCE) { 
            const d = Math.hypot(lPoint.x - tPoint.x, lPoint.y - tPoint.y); 
            const w = weights[tPoint.name] || 1.0; 
            totalDist += d * w; totalWeight += w; 
        } 
    }); 
    return totalWeight > 0 ? totalDist / totalWeight : 100; 
}

window.onload = init;