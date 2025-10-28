class BurpeesCounter {
    constructor() {
        this.duration = 0;
        this.totalBurpees = 0;
        this.timePerBurpee = 0;
        this.currentBurpee = 0;
        this.timeRemaining = 0;
        this.intervalId = null;
        this.isPaused = false;
        this.stepsPerBurpee = 0;
        this.stepInterval = 0;
        this.nextStepTime = 0;
        this.currentStep = 0;
        this.audioContext = null;
        this.soundEnabled = false;

        this.setupElements();
        this.attachEventListeners();
        this.initAudio();
        this.preloadImages();
    }

    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    preloadImages() {
        // Preload all burpee step images to prevent jittery first animation
        for (let i = 0; i <= 10; i++) {
            const img = new Image();
            const stepNumber = i.toString().padStart(2, '0');
            img.src = `navy-seal-burpee-${stepNumber}.jpg`;
        }
    }

    playTone(isLastStep = false) {
        if (!this.soundEnabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if (isLastStep) {
            // Longer, higher tone for completion
            oscillator.frequency.value = 1320; // Same as count-in start beep
            oscillator.type = 'sine';

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.25, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } else {
            // Short, neutral click sound
            oscillator.frequency.value = 880; // Same as count-in countdown beeps
            oscillator.type = 'sine';

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            oscillator.start(now);
            oscillator.stop(now + 0.05);
        }
    }

    setupElements() {
        this.header = document.getElementById('header');
        this.setupSection = document.getElementById('setup');
        this.workoutSection = document.getElementById('workout');
        this.durationInput = document.getElementById('duration');
        this.burpeesInput = document.getElementById('burpees');
        this.burpeeTypeSelect = document.getElementById('burpeeType');
        this.timePerBurpeeInput = document.getElementById('timePerBurpeeInput');
        this.preTimerInput = document.getElementById('preTimer');
        this.workoutInfo = document.getElementById('workoutInfo');
        this.startBtn = document.getElementById('startBtn');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.timePerBurpeeDisplay = document.getElementById('timePerBurpee');
        this.currentBurpeeDisplay = document.getElementById('currentBurpee');
        this.totalBurpeesDisplay = document.getElementById('totalBurpees');
        this.currentStepDisplay = document.getElementById('currentStep');
        this.timePerBurpeeLabel = document.getElementById('timePerBurpeeLabel');
        this.timePerBurpeeStat = document.getElementById('timePerBurpeeStat');
        this.burpeeStepImage1 = document.getElementById('burpeeStepImage1');
        this.burpeeStepImage2 = document.getElementById('burpeeStepImage2');
        this.globalSoundBtn = document.getElementById('globalSoundBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.soundBtn = document.getElementById('soundBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Image transition state - NEW APPROACH
        this.activeImageLayer = 1; // Which layer (1 or 2) is currently showing
        this.lastProcessedStep = 0; // Last step we processed for animation
        this.fadeStartTime = null; // When current fade started (timestamp)
        this.displayedStep = 0; // Step number currently displayed (for early increment)

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
        this.globalSoundBtn.addEventListener('click', () => this.toggleSound());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restart());
        this.soundBtn.addEventListener('click', () => this.toggleSound());
        this.resetBtn.addEventListener('click', () => this.reset());

        // Update workout info when inputs change
        this.durationInput.addEventListener('input', () => this.updateWorkoutInfo());
        this.burpeesInput.addEventListener('input', () => this.updateWorkoutInfo());
        this.burpeeTypeSelect.addEventListener('change', () => {
            this.updateMinBurpeeTime();
            this.updateWorkoutInfo();
        });
        this.timePerBurpeeInput.addEventListener('input', () => this.updateWorkoutInfo());

        // Set initial min value and show workout info on page load
        this.updateMinBurpeeTime();
        this.updateWorkoutInfo();
    }

    updateMinBurpeeTime() {
        const stepsPerBurpee = parseInt(this.burpeeTypeSelect.value);
        const minTime = stepsPerBurpee === 6 ? 3 : 5; // 3s for military, 5s for navy seal
        this.timePerBurpeeInput.min = minTime;

        // Clear value if it's below the new minimum
        const currentValue = parseFloat(this.timePerBurpeeInput.value);
        if (currentValue > 0 && currentValue < minTime) {
            this.timePerBurpeeInput.value = '';
        }
    }

    updateWorkoutInfo() {
        const durationMinutes = parseInt(this.durationInput.value) || 0;
        const burpees = parseInt(this.burpeesInput.value) || 0;
        const customTimePerBurpee = parseFloat(this.timePerBurpeeInput.value) || 0;
        const stepsPerBurpee = parseInt(this.burpeeTypeSelect.value);

        if (durationMinutes <= 0 || burpees <= 0) {
            this.workoutInfo.classList.add('hidden');
            return;
        }

        const totalSeconds = durationMinutes * 60;
        const timePerBurpeeCycle = totalSeconds / burpees;

        if (customTimePerBurpee > 0) {
            // Custom mode
            if (customTimePerBurpee > timePerBurpeeCycle) {
                // Error: not enough time
                this.workoutInfo.classList.remove('hidden');
                this.workoutInfo.classList.add('error');
                const shortfall = (customTimePerBurpee - timePerBurpeeCycle).toFixed(1);
                this.workoutInfo.textContent = `Not enough time: need ${shortfall}s more per burpee`;
            } else {
                // Valid: show both burpee time and rest time
                this.workoutInfo.classList.remove('hidden', 'error');
                const restPerBurpee = (timePerBurpeeCycle - customTimePerBurpee).toFixed(1);
                this.workoutInfo.textContent = `Burpee: ${customTimePerBurpee}s | Rest: ${restPerBurpee}s`;
            }
        } else {
            // Auto mode: time is divided into steps + 1 rest period
            // Active burpee is steps 1 through (n-1), last step is rest
            const intervalTime = timePerBurpeeCycle / (stepsPerBurpee + 1);
            const burpeeTime = intervalTime * (stepsPerBurpee - 1);
            const restTime = intervalTime * 2; // Last step + rest period

            this.workoutInfo.classList.remove('hidden', 'error');
            this.workoutInfo.textContent = `Burpee: ${burpeeTime.toFixed(1)}s | Rest: ${restTime.toFixed(1)}s`;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        // Change icon between pause and play
        const pauseIcon = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
        const playIcon = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';

        this.pauseBtn.querySelector('svg').innerHTML = this.isPaused ? playIcon : pauseIcon;
        this.pauseBtn.title = this.isPaused ? 'Resume' : 'Pause';

        if (this.isPaused && this.audioContext) {
            this.audioContext.suspend();
        } else if (this.audioContext) {
            this.audioContext.resume();
        }
    }

    restart() {
        if (!confirm('Restart the workout from the beginning?')) {
            return;
        }

        // Clear current workout
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isPaused = false;
        const pauseIcon = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
        this.pauseBtn.querySelector('svg').innerHTML = pauseIcon;
        this.pauseBtn.title = 'Pause';

        if (this.audioContext) {
            this.audioContext.resume();
        }

        // Restart with prep timer if enabled
        const preTimerSeconds = parseInt(this.preTimerInput.value);
        if (preTimerSeconds > 0) {
            this.workoutSection.classList.add('hidden');
            this.startPreCountdown(preTimerSeconds);
        } else {
            this.beginWorkout();
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const text = this.soundEnabled ? 'Sound ON' : 'Sound OFF';

        this.globalSoundBtn.title = text;
        this.soundBtn.title = text;

        if (this.soundEnabled) {
            this.globalSoundBtn.classList.remove('muted');
            this.soundBtn.classList.remove('muted');
        } else {
            this.globalSoundBtn.classList.add('muted');
            this.soundBtn.classList.add('muted');
        }
    }

    initSoundButton() {
        this.globalSoundBtn.title = 'Sound OFF';
        this.globalSoundBtn.classList.add('muted');
        this.soundBtn.title = 'Sound OFF';
        this.soundBtn.classList.add('muted');
    }

    startWorkout() {
        const durationMinutes = parseInt(this.durationInput.value);
        const burpees = parseInt(this.burpeesInput.value);
        const stepsPerBurpee = parseInt(this.burpeeTypeSelect.value);
        const customTimePerBurpee = parseFloat(this.timePerBurpeeInput.value) || 0;
        const preTimerSeconds = parseInt(this.preTimerInput.value);

        if (!durationMinutes || !burpees || durationMinutes <= 0 || burpees <= 0) {
            alert('Please enter valid numbers for duration and burpees');
            return;
        }

        // Validate custom time per burpee if specified
        if (customTimePerBurpee > 0) {
            const minTime = stepsPerBurpee === 6 ? 3 : 5;
            if (customTimePerBurpee < minTime) {
                alert(`Time per burpee must be at least ${minTime} seconds for this burpee type`);
                return;
            }

            const totalSeconds = durationMinutes * 60;
            const totalBurpeeTime = burpees * customTimePerBurpee;
            if (totalBurpeeTime > totalSeconds) {
                alert('Time per burpee is too high for the given duration and number of burpees');
                return;
            }
        }

        // Store workout parameters
        this.workoutDuration = durationMinutes;
        this.workoutBurpees = burpees;
        this.workoutStepsPerBurpee = stepsPerBurpee;
        this.workoutCustomTimePerBurpee = customTimePerBurpee;
        this.workoutPrepTime = preTimerSeconds;

        // Start workout immediately (prep time is now at step 0/6 of first burpee)
        this.beginWorkout();
    }

    beginWorkout() {
        const durationMinutes = this.workoutDuration;
        const burpees = this.workoutBurpees;
        const stepsPerBurpee = this.workoutStepsPerBurpee;
        const customTimePerBurpee = this.workoutCustomTimePerBurpee;

        this.duration = durationMinutes * 60; // Convert to seconds
        this.totalBurpees = burpees;
        this.stepsPerBurpee = stepsPerBurpee;

        // Calculate time per burpee cycle (including rest)
        this.timePerBurpee = this.duration / this.totalBurpees;

        // Calculate active burpee time and step intervals
        // Steps 1-(n-1) are active, step n (last step) is rest
        if (customTimePerBurpee > 0) {
            // Use custom time for active burpee, rest fills the remaining time
            this.activeBurpeeTime = customTimePerBurpee;
            this.stepInterval = this.activeBurpeeTime / (this.stepsPerBurpee - 1); // e.g., 5 active steps for military
        } else {
            // Auto mode: time is divided equally across all intervals
            this.stepInterval = this.timePerBurpee / (this.stepsPerBurpee + 1); // 7 intervals total
            this.activeBurpeeTime = this.stepInterval * (this.stepsPerBurpee - 1); // 5 active steps
        }

        this.restTime = this.timePerBurpee - this.activeBurpeeTime; // Includes last step + rest period
        this.prepTime = this.workoutPrepTime || 0;

        this.currentBurpee = 1;
        // First burpee starts with step 0 (prep time)
        this.currentStep = 0;
        // First cycle includes prep time + active time + rest time
        this.timeRemaining = this.prepTime + this.timePerBurpee;
        // Step 1 starts after prep time (at timePerBurpee mark)
        this.nextStepTime = this.timePerBurpee;

        // Initialize image state - NEW APPROACH
        this.activeImageLayer = 1;
        this.lastProcessedStep = 0;
        this.fadeStartTime = null;
        this.displayedStep = 0;

        // Set initial image
        if (this.burpeeStepImage1 && this.burpeeStepImage2) {
            this.burpeeStepImage1.src = 'navy-seal-burpee-00.jpg';
            this.burpeeStepImage2.src = 'navy-seal-burpee-00.jpg';
            this.burpeeStepImage1.style.opacity = '1';
            this.burpeeStepImage2.style.opacity = '0';
        }

        this.updateDisplay();
        this.header.classList.add('hidden');
        this.setupSection.classList.add('hidden');
        this.workoutSection.classList.remove('hidden');

        this.startTimer();
    }

    startTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            if (this.isPaused) return;

            this.timeRemaining -= 0.01;

            // Check if we need to advance to the next step
            if (this.currentStep < this.stepsPerBurpee && this.timeRemaining <= this.nextStepTime) {
                this.currentStep++;
                const isLastStep = this.currentStep === this.stepsPerBurpee;

                // Play tone for steps 1-6 (not for step 0 which is prep/rest)
                if (this.currentStep > 0) {
                    this.playTone(isLastStep);
                    this.updateStepImage();
                }

                // If we just completed step 6, jump directly to rest period
                if (isLastStep) {
                    this.timeRemaining = this.restTime;
                } else {
                    this.nextStepTime -= this.stepInterval;
                }
            }

            // Update image crossfade transition
            this.updateImageTransition();

            // Update rest overlay visibility
            this.updateRestOverlay();

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

        // After first burpee, start at step 1 (not step 0)
        this.currentStep = 1;

        // Step 1 has just started, next step (2) will trigger at:
        this.nextStepTime = this.timePerBurpee - this.stepInterval;

        // Play tone for step 1 and set to step 1 image
        this.playTone(false);
        if (this.burpeeStepImage1 && this.burpeeStepImage2) {
            const imageStep = this.getImageStepForCurrentStep();
            const imageSrc = `navy-seal-burpee-${imageStep.toString().padStart(2, '0')}.jpg`;
            this.burpeeStepImage1.src = imageSrc;
            this.burpeeStepImage2.src = imageSrc;
            this.burpeeStepImage1.style.opacity = '1';
            this.burpeeStepImage2.style.opacity = '0';
            this.activeImageLayer = 1;
            this.lastProcessedStep = 1;
            this.fadeStartTime = null;
            this.displayedStep = 1;
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
        this.updateBurpeeDisplay();
        this.updateStepDisplay();
        this.updateCountdown();
    }

    updateBurpeeDisplay() {
        // Determine how many digits the total has
        const totalDigits = this.totalBurpees.toString().length;
        const currentDigits = this.currentBurpee.toString().length;
        const paddingNeeded = totalDigits - currentDigits;

        let currentBurpeeStr = this.currentBurpee.toString();
        if (paddingNeeded > 0) {
            const padding = '<span class="invisible-zero">0</span>'.repeat(paddingNeeded);
            currentBurpeeStr = padding + currentBurpeeStr;
        }

        this.currentBurpeeDisplay.innerHTML = currentBurpeeStr;
        this.totalBurpeesDisplay.textContent = this.totalBurpees;
    }

    updateStepDisplay() {
        const currentStepStr = this.displayedStep < 10
            ? `<span class="invisible-zero">0</span>${this.displayedStep}`
            : this.displayedStep.toString();
        this.currentStepDisplay.innerHTML = `${currentStepStr}/${this.stepsPerBurpee}`;
    }

    updateRestOverlay() {
        if (!this.timePerBurpeeLabel || !this.timePerBurpeeStat) return;

        // Change label and styling during rest periods:
        // Rest is only after completing all steps (6/6)
        const inRestPeriod = this.currentStep >= this.stepsPerBurpee && this.timeRemaining <= this.restTime;

        // Step 0 of first burpee is prep time (show as "Prep time")
        const isFirstBurpeePrepTime = this.currentBurpee === 1 && this.currentStep === 0;

        if (inRestPeriod) {
            this.timePerBurpeeLabel.textContent = 'Rest time';
            this.timePerBurpeeStat.classList.add('rest');
        } else if (isFirstBurpeePrepTime) {
            this.timePerBurpeeLabel.textContent = 'Prep time';
            this.timePerBurpeeStat.classList.remove('rest');
        } else {
            this.timePerBurpeeLabel.textContent = 'Burpee time';
            this.timePerBurpeeStat.classList.remove('rest');
        }
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

        // Update step counter display at 75% of transition
        if (progress >= 0.75 && this.displayedStep !== this.currentStep) {
            this.displayedStep = this.currentStep;
            this.updateStepDisplay();
        }

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
        let displayTime = Math.max(0, this.timeRemaining);

        // Determine if we're in rest period, prep time, or active burpee
        const inRestPeriod = this.currentStep >= this.stepsPerBurpee && this.timeRemaining <= this.restTime;
        const isFirstBurpeePrepTime = this.currentBurpee === 1 && this.currentStep === 0;

        // For rest period, show only the rest countdown
        if (inRestPeriod) {
            displayTime = this.timeRemaining;
        } else if (isFirstBurpeePrepTime) {
            // For prep time, show prep countdown
            displayTime = this.timeRemaining - this.timePerBurpee;
        } else {
            // For active burpee, show time in current step interval
            // Calculate which step we're on and show time until next step
            displayTime = this.timeRemaining - this.restTime;
        }

        displayTime = Math.max(0, displayTime);

        // Update individual time countdown - pad with invisible zero
        const timeSeconds = displayTime.toFixed(1);
        if (displayTime < 10) {
            this.timePerBurpeeDisplay.innerHTML = `<span class="invisible-zero">0</span>${timeSeconds} s`;
        } else {
            this.timePerBurpeeDisplay.textContent = `${timeSeconds} s`;
        }

        // Calculate total time remaining - pad with invisible zero
        const burpeesRemaining = this.totalBurpees - this.currentBurpee;
        let totalTimeRemaining = this.timeRemaining + (burpeesRemaining * this.timePerBurpee);
        // Subtract prep time since it only happens once
        if (this.currentBurpee > 1 || this.currentStep > 0) {
            totalTimeRemaining -= this.prepTime;
        }
        const minutes = Math.floor(totalTimeRemaining / 60);
        const seconds = Math.floor(totalTimeRemaining % 60);
        const minutesStr = minutes < 10 ? `<span class="invisible-zero">0</span>${minutes}` : minutes.toString();
        this.totalTimeDisplay.innerHTML = `${minutesStr}:${seconds.toString().padStart(2, '0')}`;
    }

    reset() {
        if (!confirm('End workout and return to setup?')) {
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.duration = 0;
        this.totalBurpees = 0;
        this.timePerBurpee = 0;
        this.currentBurpee = 0;
        this.timeRemaining = 0;
        this.isPaused = false;

        // Reset pause button icon
        const pauseIcon = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
        this.pauseBtn.querySelector('svg').innerHTML = pauseIcon;
        this.pauseBtn.title = 'Pause';

        if (this.audioContext) {
            this.audioContext.resume();
        }

        this.workoutSection.classList.add('hidden');
        this.setupSection.classList.remove('hidden');
        this.header.classList.remove('hidden');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BurpeesCounter();
});
