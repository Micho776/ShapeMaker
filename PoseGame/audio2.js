const AudioEngine = {
    ctx: null,
    musicNodes: [],
    isPlaying: false,

    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.setupInteractions();
    },

    setupInteractions: function() {
        document.querySelectorAll('button, .mode-card').forEach(el => {
            el.addEventListener('mouseenter', () => this.playHover());
            el.addEventListener('mousedown', () => this.playClick());
        });
    },

    // --- SYNTHESIZERS ---

    playTone: function(freq, type, duration, vol = 0.1, time = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + time);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + time + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + time);
        osc.stop(this.ctx.currentTime + time + duration);
    },

    // UI Sounds
    playHover: function() {
        this.playTone(800, 'sine', 0.05, 0.05);
        this.playTone(1200, 'triangle', 0.02, 0.02);
    },

    playClick: function() {
        this.playTone(200, 'square', 0.1, 0.1);
        this.playTone(100, 'sawtooth', 0.15, 0.1);
    },

    // --- NEW: LOUDER TICKING ENGINE ---
    playCountdown: function(secondsLeft, isUrgent) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Pitch logic: 
        // Normal: 600Hz (steady)
        // Urgent: Risers from 800Hz to 1500Hz
        let pitch = 600; 
        let vol = 0.3; // Base volume (louder than before)

        if (isUrgent) {
            pitch = 800 + (10 - secondsLeft) * 80;
            vol = 0.8; // MAX VOLUME for final countdown
        }

        // Use 'square' wave for a sharp "digital/mechanical" tick
        osc.type = isUrgent ? 'square' : 'triangle'; 
        osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);

        // Envelope: Sharp attack (click) -> fast decay
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.005); // Click
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1); // Tail

        // High-pass filter to remove mud and make it "clicky"
        const filter = this.ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = isUrgent ? 1000 : 500;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },

    // Gameplay Sounds
    playLockProgress: function(percent) {
        // Sci-fi rising pitch
        const base = 220;
        const freq = base + (percent * 5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(freq + 50, this.ctx.currentTime + 0.1);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    playSuccess: function() {
        const root = 523.25;
        const third = 659.25;
        const fifth = 783.99;
        const oct = 1046.50;
        this.playTone(root, 'triangle', 0.4, 0.2, 0);
        this.playTone(third, 'triangle', 0.4, 0.2, 0.05);
        this.playTone(fifth, 'triangle', 0.4, 0.2, 0.1);
        this.playTone(oct, 'sine', 0.8, 0.3, 0.15);
    },

    // Background Music
    startMusic: function() {
        if(this.isPlaying) return;
        this.isPlaying = true;
        this.scheduleNote();
    },

    stopMusic: function() {
        this.isPlaying = false;
        this.musicNodes.forEach(n => n.stop());
        this.musicNodes = [];
    },

    scheduleNote: function() {
        if(!this.isPlaying) return;
        const sequence = [110, 110, 130.81, 146.83];
        const beatLen = 0.5;
        const now = this.ctx.currentTime;
        
        sequence.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
            osc.frequency.value = freq;
            
            const start = now + (i * beatLen);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.03, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + beatLen - 0.05);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + beatLen);
        });
        setTimeout(() => this.scheduleNote(), sequence.length * beatLen * 1000);
    }
};