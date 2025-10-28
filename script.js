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
        this.soundEnabled = false;

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
        this.burpeeStepImage1 = document.getElementById('burpeeStepImage1');
        this.burpeeStepImage2 = document.getElementById('burpeeStepImage2');
        this.soundBtn = document.getElementById('soundBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Image transition state - NEW APPROACH
        this.activeImageLayer = 1; // Which layer (1 or 2) is currently showing
        this.lastProcessedStep = 0; // Last step we processed for animation
        this.fadeStartTime = null; // When current fade started (timestamp)

        this.initSoundButton();
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

    initSoundButton() {
        this.soundBtn.textContent = 'Sound: OFF';
        this.soundBtn.classList.add('muted');
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

        // Initialize image state - NEW APPROACH
        this.activeImageLayer = 1;
        this.lastProcessedStep = 0;
        this.fadeStartTime = null;

        // Set initial image
        if (this.burpeeStepImage1 && this.burpeeStepImage2) {
            this.burpeeStepImage1.src = 'navy-seal-burpee-00.jpg';
            this.burpeeStepImage2.src = 'navy-seal-burpee-00.jpg';
            this.burpeeStepImage1.style.opacity = '1';
            this.burpeeStepImage2.style.opacity = '0';
        }

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
                this.updateStepImage();
                this.nextStepTime -= this.stepInterval;
            }

            // Update image crossfade transition
            this.updateImageTransition();

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

        // Reset to step 0 - NEW APPROACH
        if (this.burpeeStepImage1 && this.burpeeStepImage2) {
            this.burpeeStepImage1.src = 'navy-seal-burpee-00.jpg';
            this.burpeeStepImage2.src = 'navy-seal-burpee-00.jpg';
            this.burpeeStepImage1.style.opacity = '1';
            this.burpeeStepImage2.style.opacity = '0';
            this.activeImageLayer = 1;
            this.lastProcessedStep = 0;
            this.fadeStartTime = null;
        }

        this.updateDisplay();
    }

    finishWorkout() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        alert('Workout complete! Great job!');
        this.reset();
    }

    updateDisplay() {
        this.currentBurpeeDisplay.textContent = this.currentBurpee;
        this.totalBurpeesDisplay.textContent = this.totalBurpees;
        this.updateCountdown();
    }

    getImageStepForCurrentStep() {
        // Map current step to image step
        if (this.stepsPerBurpee === 6) {
            // Map 6 military burpee steps to 10 navy seal steps (skip 4-7)
            const stepMapping = [0, 1, 2, 3, 8, 9, 10];
            return stepMapping[this.currentStep] || 0;
        } else {
            // Direct mapping for 10-step burpees
            return this.currentStep;
        }
    }

    updateStepImage() {
        // NEW APPROACH - Called when currentStep changes (from timer when audio beeps)
        if (!this.burpeeStepImage1 || !this.burpeeStepImage2) return;

        const targetImageStep = this.getImageStepForCurrentStep();

        // Only process if this is actually a NEW step
        if (targetImageStep === this.lastProcessedStep) return;

        this.lastProcessedStep = targetImageStep;
        this.fadeStartTime = Date.now();

        // Determine which layer to fade TO
        const fadeToLayer = this.activeImageLayer === 1 ? 2 : 1;
        const fadeToImage = fadeToLayer === 1 ? this.burpeeStepImage1 : this.burpeeStepImage2;

        // Load new image into the layer we're fading to
        const stepNumber = targetImageStep.toString().padStart(2, '0');
        fadeToImage.src = `navy-seal-burpee-${stepNumber}.jpg`;
    }

    updateImageTransition() {
        // NEW APPROACH - Called every frame to update the crossfade
        if (!this.burpeeStepImage1 || !this.burpeeStepImage2) return;
        if (this.fadeStartTime === null) {
            // No active fade - ensure correct layer is visible
            if (this.activeImageLayer === 1) {
                this.burpeeStepImage1.style.opacity = '1';
                this.burpeeStepImage2.style.opacity = '0';
            } else {
                this.burpeeStepImage1.style.opacity = '0';
                this.burpeeStepImage2.style.opacity = '1';
            }
            return;
        }

        // Calculate fade progress based on time elapsed
        const elapsed = (Date.now() - this.fadeStartTime) / 1000; // seconds
        const transitionDuration = this.stepInterval / 4; // Use quarter of the step interval
        const progress = Math.min(1, elapsed / transitionDuration);

        if (progress >= 1) {
            // Fade complete - swap active layer
            this.activeImageLayer = this.activeImageLayer === 1 ? 2 : 1;
            this.fadeStartTime = null;

            // Set final opacities
            if (this.activeImageLayer === 1) {
                this.burpeeStepImage1.style.opacity = '1';
                this.burpeeStepImage2.style.opacity = '0';
            } else {
                this.burpeeStepImage1.style.opacity = '0';
                this.burpeeStepImage2.style.opacity = '1';
            }
        } else {
            // Fade in progress
            if (this.activeImageLayer === 1) {
                // Fading from 1 to 2
                this.burpeeStepImage1.style.opacity = (1 - progress).toFixed(2);
                this.burpeeStepImage2.style.opacity = progress.toFixed(2);
            } else {
                // Fading from 2 to 1
                this.burpeeStepImage1.style.opacity = progress.toFixed(2);
                this.burpeeStepImage2.style.opacity = (1 - progress).toFixed(2);
            }
        }
    }

    updateCountdown() {
        const displayTime = Math.max(0, this.timeRemaining);

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
