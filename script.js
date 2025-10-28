class BurpeesCounter {
    constructor() {
        this.duration = 0;
        this.totalBurpees = 0;
        this.timePerBurpee = 0;
        this.currentBurpee = 0;
        this.timeRemaining = 0;
        this.intervalId = null;
        this.stepsPerBurpee = 0;
        this.stepInterval = 0;
        this.nextStepTime = 0;
        this.currentStep = 0;
        this.audioContext = null;
        this.soundEnabled = true;

        this.setupElements();
        this.attachEventListeners();
        this.initAudio();
    }

    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(isLastStep = false) {
        if (!this.soundEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if (isLastStep) {
            // Longer, lower tone for completion
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.25, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } else {
            // Short, neutral click sound
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            oscillator.start(now);
            oscillator.stop(now + 0.05);
        }
    }

    setupElements() {
        this.setupSection = document.getElementById('setup');
        this.workoutSection = document.getElementById('workout');
        this.durationInput = document.getElementById('duration');
        this.burpeesInput = document.getElementById('burpees');
        this.burpeeTypeSelect = document.getElementById('burpeeType');
        this.startBtn = document.getElementById('startBtn');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.timePerBurpeeDisplay = document.getElementById('timePerBurpee');
        this.currentBurpeeDisplay = document.getElementById('currentBurpee');
        this.totalBurpeesDisplay = document.getElementById('totalBurpees');
        this.progressBar = document.getElementById('progressBar');
        this.soundBtn = document.getElementById('soundBtn');
        this.resetBtn = document.getElementById('resetBtn');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => {
            // Resume audio context on user interaction (required by browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.startWorkout();
        });
        this.soundBtn.addEventListener('click', () => this.toggleSound());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundBtn.textContent = this.soundEnabled ? 'Sound: ON' : 'Sound: OFF';
        if (this.soundEnabled) {
            this.soundBtn.classList.remove('muted');
        } else {
            this.soundBtn.classList.add('muted');
        }
    }

    startWorkout() {
        const durationMinutes = parseInt(this.durationInput.value);
        const burpees = parseInt(this.burpeesInput.value);
        const stepsPerBurpee = parseInt(this.burpeeTypeSelect.value);

        if (!durationMinutes || !burpees || durationMinutes <= 0 || burpees <= 0) {
            alert('Please enter valid numbers for duration and burpees');
            return;
        }

        this.duration = durationMinutes * 60; // Convert to seconds
        this.totalBurpees = burpees;
        this.stepsPerBurpee = stepsPerBurpee;
        this.timePerBurpee = this.duration / this.totalBurpees;
        this.stepInterval = this.timePerBurpee / (this.stepsPerBurpee + 1); // steps + 1 rest period
        this.currentBurpee = 1;
        this.timeRemaining = this.timePerBurpee;
        this.currentStep = 0;
        this.nextStepTime = this.timePerBurpee - this.stepInterval;

        this.updateDisplay();
        this.setupSection.classList.add('hidden');
        this.workoutSection.classList.remove('hidden');

        this.startTimer();
    }

    startTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            this.timeRemaining -= 0.01;

            // Check if we need to play a tone for the next step
            if (this.currentStep < this.stepsPerBurpee && this.timeRemaining <= this.nextStepTime) {
                this.currentStep++;
                const isLastStep = this.currentStep === this.stepsPerBurpee;
                this.playTone(isLastStep);
                this.nextStepTime -= this.stepInterval;
            }

            if (this.timeRemaining <= 0) {
                this.nextBurpee();
            } else {
                this.updateCountdown();
            }
        }, 10);
    }

    nextBurpee() {
        if (this.currentBurpee >= this.totalBurpees) {
            this.finishWorkout();
            return;
        }

        this.currentBurpee++;
        this.timeRemaining = this.timePerBurpee;
        this.currentStep = 0;
        this.nextStepTime = this.timePerBurpee - this.stepInterval;
        this.updateDisplay();
    }

    finishWorkout() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.progressBar.style.width = '0%';
        alert('Workout complete! Great job!');
        this.reset();
    }

    updateDisplay() {
        this.currentBurpeeDisplay.textContent = this.currentBurpee;
        this.totalBurpeesDisplay.textContent = this.totalBurpees;

        this.updateCountdown();
    }

    updateCountdown() {
        const displayTime = Math.max(0, this.timeRemaining);
        const percentage = (displayTime / this.timePerBurpee) * 100;
        this.progressBar.style.width = `${percentage}%`;

        // Update individual burpee countdown - pad with invisible zero
        const burpeeSeconds = displayTime.toFixed(1);
        if (displayTime < 10) {
            this.timePerBurpeeDisplay.innerHTML = `<span class="invisible-zero">0</span>${burpeeSeconds} s`;
        } else {
            this.timePerBurpeeDisplay.textContent = `${burpeeSeconds} s`;
        }

        // Calculate total time remaining - pad with invisible zero
        const burpeesRemaining = this.totalBurpees - this.currentBurpee;
        const totalTimeRemaining = this.timeRemaining + (burpeesRemaining * this.timePerBurpee);
        const minutes = Math.floor(totalTimeRemaining / 60);
        const seconds = Math.floor(totalTimeRemaining % 60);
        const minutesStr = minutes < 10 ? `<span class="invisible-zero">0</span>${minutes}` : minutes.toString();
        this.totalTimeDisplay.innerHTML = `${minutesStr}:${seconds.toString().padStart(2, '0')}`;
    }

    reset() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.duration = 0;
        this.totalBurpees = 0;
        this.timePerBurpee = 0;
        this.currentBurpee = 0;
        this.timeRemaining = 0;

        this.workoutSection.classList.add('hidden');
        this.setupSection.classList.remove('hidden');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BurpeesCounter();
});
