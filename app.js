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

// Six discrete preset levels with smaller, more subtle angle ranges
// Gauge range: -60° (left/resting) to +60° (right/fully charged)
const LEVELS = {
    1: -60,   // Resting
    2: -36,   // Slightly Rising
    3: -12,   // Rising
    4: 12,    // Strong Movement
    5: 36,    // Near the Top
    6: 60     // Fully Charged
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
    const dampingForce = velocity * SPRING_CONFIG.damping;

    // Calculate acceleration (F = ma, so a = F/m)
    const acceleration = (springForce - dampingForce) / SPRING_CONFIG.mass;

    // Update velocity and position
    velocity += acceleration;
    currentAngle += velocity;

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
 * Trigger applause wobble effect
 * Adds a random velocity kick for organic movement
 */
function triggerWobble() {
    // Allow wobble even if animating (but cap it so it doesn't get silly)
    const MAX_KICK = 2.0;

    // Randomized kick feels more "alive"
    const kick = (Math.random() * 2 - 1) * MAX_KICK;

    velocity += kick;

    // Ensure animation loop is running
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(springStep);
    }

    console.log('Applause wobble (kick)');
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
