/**
 * GOOD-OMETER - Live Event Projection Controller
 * Keyboard-operated analog gauge with discrete preset levels
 * Spring-based needle animation for smooth, mechanical movement
 */

// State
let currentLevel = 1;
let isAnimating = false;

// Spring physics state
let currentAngle = 0;
let targetAngle = 0;
let velocity = 0;
let animationFrameId = null;

// Spring physics constants (tuned for smooth, mechanical feel)
const SPRING_CONFIG = {
    stiffness: 0.08,      // Lower = slower, calmer movement
    damping: 0.75,        // Higher = less overshoot, more controlled
    mass: 1.2,            // Heavier feel
    precision: 0.01       // Stop animating when close enough
};

let wobbleUntil = 0;

const WOBBLE_CONFIG = {
    durationMs: 900,      // how long applause mode lasts after last tap
    damping: 0.30,        // looser damping during applause
    kick: 3.2,            // velocity per tap
    maxVelocity: 16.0,    // safety clamp
    maxOverdrive: 35      // degrees beyond target the needle can swing
};

// Six discrete preset levels with expanded range for rightward applause overdrive
const LEVELS = {
    1: -120,
    2: -80,
    3: -40,
    4: 0,
    5: 40,
    6: 120
};

// DOM elements
const needle = document.getElementById('needle');
const helpOverlay = document.getElementById('help-overlay');

/**
 * Initialize the app
 */
function init() {
    // Set initial needle position (Level 1)
    currentAngle = LEVELS[1];
    targetAngle = LEVELS[1];
    setNeedleRotation(currentAngle);

    // Set up keyboard listeners
    document.addEventListener('keydown', handleKeyPress);

    // Prevent spacebar from scrolling
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
        }
    });

    console.log('GOOD-OMETER initialized. Press H for help.');
}

/**
 * Handle keyboard input
 */
function handleKeyPress(event) {
    const key = event.key.toLowerCase();
    const code = event.code;

    // Toggle help overlay
    if (key === 'h') {
        toggleHelp();
        return;
    }

    // Spacebar triggers applause wobble
    if (code === 'Space' || key === ' ') {
        triggerWobble();
        return;
    }

    // Number keys 1-6: jump to specific level
    if (key >= '1' && key <= '6') {
        const level = parseInt(key);
        setNeedleToLevel(level);
        return;
    }

    // Arrow up: step up one level
    if (code === 'ArrowUp') {
        stepUp();
        return;
    }

    // Arrow down: step down one level
    if (code === 'ArrowDown') {
        stepDown();
        return;
    }

    // R: reset to Level 1
    if (key === 'r') {
        reset();
        return;
    }
}

/**
 * Set needle rotation (direct DOM update)
 * @param {number} angle - Rotation angle in degrees
 */
function setNeedleRotation(angle) {
    // Use SVG transform attribute with rotation center at (400, 350)
    needle.setAttribute('transform', `rotate(${angle} 400 350)`);
}

/**
 * Spring physics animation step
 */
function springStep() {
    // Calculate spring force (Hooke's law)
    const displacement = targetAngle - currentAngle;
    const springForce = displacement * SPRING_CONFIG.stiffness;

    // Calculate damping force
    const now = performance.now();
    const damping = (now < wobbleUntil) ? WOBBLE_CONFIG.damping : SPRING_CONFIG.damping;
    const dampingForce = velocity * damping;

    // Calculate acceleration (F = ma, so a = F/m)
    const acceleration = (springForce - dampingForce) / SPRING_CONFIG.mass;

    // Update velocity and position
    velocity += acceleration;

    // Safety clamp so repeated taps build energy but never become chaotic
    velocity = Math.max(-WOBBLE_CONFIG.maxVelocity, Math.min(WOBBLE_CONFIG.maxVelocity, velocity));

    currentAngle += velocity;

    // Allow temporary rightward overdrive, but not infinite
    const maxAngle = targetAngle + WOBBLE_CONFIG.maxOverdrive;
    const minAngle = Math.min(targetAngle, LEVELS[1]); // can't go below level 1, only overdrive right

    currentAngle = Math.max(minAngle, Math.min(maxAngle, currentAngle));

    // Apply the rotation
    setNeedleRotation(currentAngle);

    // Check if we're close enough to stop
    const isSettled = Math.abs(displacement) < SPRING_CONFIG.precision &&
                      Math.abs(velocity) < SPRING_CONFIG.precision;

    if (isSettled) {
        // Snap to target and stop animating
        currentAngle = targetAngle;
        velocity = 0;
        setNeedleRotation(currentAngle);
        isAnimating = false;
        animationFrameId = null;
        console.log(`Settled at ${currentAngle.toFixed(1)}°`);
    } else {
        // Continue animation
        animationFrameId = requestAnimationFrame(springStep);
    }
}

/**
 * Start spring animation to target angle
 * @param {number} angle - Target angle in degrees
 */
function animateToAngle(angle) {
    // Cancel any existing animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    targetAngle = angle;
    isAnimating = true;

    // Start spring animation loop
    animationFrameId = requestAnimationFrame(springStep);
}

/**
 * Set needle to a specific level
 * @param {number} level - Target level (1-6)
 */
function setNeedleToLevel(level) {
    // Validate level
    if (level < 1) level = 1;
    if (level > 6) level = 6;

    currentLevel = level;
    const angle = LEVELS[level];

    animateToAngle(angle);
    console.log(`Level ${level} → ${angle}°`);
}

/**
 * Step up one level
 */
function stepUp() {
    if (currentLevel < 6) {
        setNeedleToLevel(currentLevel + 1);
    }
}

/**
 * Step down one level
 */
function stepDown() {
    if (currentLevel > 1) {
        setNeedleToLevel(currentLevel - 1);
    }
}

/**
 * Reset to Level 1
 */
function reset() {
    setNeedleToLevel(1);
}

/**
 * Trigger rightward applause pump
 * Each press pushes the needle to the right, then naturally settles back
 */
function triggerWobble() {
    // Rightward kick only (not symmetric)
    const kick = Math.random() * WOBBLE_CONFIG.kick;
    velocity += kick;

    // Enter applause mode with reduced damping
    wobbleUntil = performance.now() + WOBBLE_CONFIG.durationMs;

    // Ensure animation loop is running
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(springStep);
    }

    console.log('Applause pump (rightward kick)');
}

/**
 * Toggle help overlay visibility
 */
function toggleHelp() {
    helpOverlay.classList.toggle('hidden');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
