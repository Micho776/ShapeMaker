const AudioEngine = {
    ctx: null,
    musicNodes: [],
    isMusicPlaying: false,

    init: function() {
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    // --- SFX ---
    playTone: function(freq, type, duration, vol=0.1) {
        if(!this.ctx) this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playLockTick: function() { this.playTone(800, 'square', 0.05, 0.05); },
    playSuccess: function() { 
        this.playTone(440, 'sine', 0.5, 0.2); 
        setTimeout(() => this.playTone(554, 'sine', 0.5, 0.2), 100); 
        setTimeout(() => this.playTone(659, 'sine', 0.8, 0.2), 200); 
    },
    playError: function() { this.playTone(150, 'sawtooth', 0.3, 0.2); },

    // --- BACKGROUND MUSIC (GENERATED DRONE) ---
    startMusic: function() {
        if(this.isMusicPlaying || !this.ctx) return;
        this.isMusicPlaying = true;

        // Create a deep bass drone (Blade Runner style)
        const createDrone = (freq, pan) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const panner = this.ctx.createStereoPanner();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            // Lowpass filter to make it muffled and dark
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 200; 

            gain.gain.value = 0.05; // Low volume
            panner.pan.value = pan;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(this.ctx.destination);
            
            osc.start();
            this.musicNodes.push(osc);
        };

        createDrone(50, -0.5); // Left ear bass
        createDrone(51, 0.5);  // Right ear bass (creates binaural beat)
    },

    stopMusic: function() {
        this.musicNodes.forEach(n => n.stop());
        this.musicNodes = [];
        this.isMusicPlaying = false;
    }
};