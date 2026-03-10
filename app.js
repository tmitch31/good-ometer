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

let applauseCharge = 0; // degrees added to the right of the current level
let wasWobbling = false;  // tracks wobble→calm transition for charge retention
let idlePhase = Math.random() * Math.PI * 2; // phase for idle oscillation

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
    maxOverdrive: 200,    // pump can go much further now
    chargeStep: 8,        // degrees added per spacebar tap
    chargeDecay: 0.985,   // decay per frame once applause ends (slower fallback)
    retentionFactor: 0.35 // fraction of peak charge permanently absorbed into targetAngle
};

// Arrow key nudge amount (small incremental adjustments)
const ARROW_STEP_DEGREES = 5;

// Overshoot amount when jumping to a level via number keys
// Simulates the inertia of a real mechanical gauge needle
const LEVEL_OVERSHOOT = 2; // degrees — subtle, not exaggerated

// Idle needle motion (subtle "alive" oscillation when at rest)
const IDLE_CONFIG = {
    amplitude: 1.0,   // degrees
    speed: 0.0014     // radians per ms
};

// Dial geometry - 40 tick marks across the full angular sweep
const DIAL_MIN_ANGLE = -150;  // Left-most resting position (just below 8 o'clock)
const DIAL_MAX_ANGLE = 115;   // Far-right maximum
const TICK_COUNT = 40;
const TICK_ANGLE = (DIAL_MAX_ANGLE - DIAL_MIN_ANGLE) / TICK_COUNT;  // 6.625° per tick

// Eight discrete preset levels
// Level 1 = just below 8 o'clock (-135°), Level 8 = DIAL_MAX_ANGLE (115°)
// Levels 2-7 evenly spaced: step = (115 - (-135)) / 7 = 35.714° per level
const LEVELS = {
    1: -135,   // Just below 8 o'clock position
    2: -99.3,  // -135 + 35.7
    3: -63.6,  // -135 + 71.4
    4: -27.9,  // -135 + 107.1
    5:   7.9,  // -135 + 142.9
    6:  43.6,  // -135 + 178.6
    7:  79.3,  // -135 + 214.3
    8: 115     // DIAL_MAX_ANGLE = 115° (far-right maximum)
};

// DOM elements
const needle = document.getElementById('needle-group');
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

    // Number keys 1-8: jump to specific level
    if (key >= '1' && key <= '8') {
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
    // Use SVG transform attribute with rotation center at (957.03, 764.11)
    needle.setAttribute('transform', `rotate(${angle} 957.03 764.11)`);
}

/**
 * Spring physics animation step
 */
function springStep() {
    const now = performance.now();

    // Applause charge management
    const isWobbling = now < wobbleUntil;

    if (isWobbling) {
        // Actively applauding — charge is held at its current level
        wasWobbling = true;
    } else {
        if (wasWobbling) {
            // First frame after applause ends: absorb a fraction of charge into targetAngle
            // so the needle settles at a genuinely higher resting point
            const retained = applauseCharge * WOBBLE_CONFIG.retentionFactor;
            targetAngle = Math.min(targetAngle + retained, LEVELS[8] + 20);
            applauseCharge -= retained; // only the remainder decays away
            wasWobbling = false;
        }

        // Decay the remaining (non-retained) charge back to zero
        applauseCharge *= WOBBLE_CONFIG.chargeDecay;
        if (Math.abs(applauseCharge) < 0.1) {
            applauseCharge = 0;
        }
    }

    // Calculate spring force using effective target (includes applause charge)
    const effectiveTarget = targetAngle + applauseCharge;
    const displacement = effectiveTarget - currentAngle;
    const springForce = displacement * SPRING_CONFIG.stiffness;

    // Calculate damping force
    const damping = isWobbling ? WOBBLE_CONFIG.damping : SPRING_CONFIG.damping;
    const dampingForce = velocity * damping;

    // Calculate acceleration (F = ma, so a = F/m)
    const acceleration = (springForce - dampingForce) / SPRING_CONFIG.mass;

    // Update velocity and position
    velocity += acceleration;

    // Safety clamp so repeated taps build energy but never become chaotic
    velocity = Math.max(-WOBBLE_CONFIG.maxVelocity, Math.min(WOBBLE_CONFIG.maxVelocity, velocity));

    currentAngle += velocity;

    // Allow temporary rightward overdrive, but not infinite
    const maxAngle = Math.max(
        LEVELS[8] + 30,  // global ceiling (a little past Level 8)
        targetAngle + WOBBLE_CONFIG.maxOverdrive
    );
    const minAngle = Math.min(targetAngle, LEVELS[1]); // can't go below level 1, only overdrive right

    currentAngle = Math.max(minAngle, Math.min(maxAngle, currentAngle));

    // Apply the rotation
    setNeedleRotation(currentAngle);

    // Check if we're close enough to stop (also check applauseCharge)
    const isSettled = Math.abs(displacement) < SPRING_CONFIG.precision &&
                      Math.abs(velocity) < SPRING_CONFIG.precision &&
                      Math.abs(applauseCharge) < 0.1;

    if (isSettled) {
        velocity = 0;

        // Only run idle life when applause is inactive
        const now = performance.now();
        const applauseActive = (now < wobbleUntil) || (applauseCharge > 0);

        if (!applauseActive) {
            idlePhase += IDLE_CONFIG.speed * 16; // approx per-frame advance
            const idleOffset = Math.sin(idlePhase) * IDLE_CONFIG.amplitude;

            const idleAngle = Math.min(currentAngle + idleOffset, LEVELS[8] + 20);
            setNeedleRotation(idleAngle);

            animationFrameId = requestAnimationFrame(springStep);
            return;
        }

        // If applause is active, just hold steady and keep animating normally
        setNeedleRotation(currentAngle);
        animationFrameId = requestAnimationFrame(springStep);
        return;
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
 * Applies a brief overshoot past the target to mimic mechanical gauge inertia,
 * then lets the spring settle back to the true level position.
 * @param {number} level - Target level (1-8)
 */
function setNeedleToLevel(level) {
    // Validate level
    if (level < 1) level = 1;
    if (level > 8) level = 8;

    currentLevel = level;
    const angle = LEVELS[level];

    // Explicit level jumps clear any lingering applause charge
    applauseCharge = 0;
    wasWobbling = false;

    // Step 1: aim slightly past the target so the spring carries the needle beyond it
    animateToAngle(angle + LEVEL_OVERSHOOT);

    // Step 2: after a short delay, pull the target back to the true level position
    // The spring naturally handles the settle-back from the overshoot position
    setTimeout(() => {
        targetAngle = angle;
    }, 200);

    console.log(`Level ${level} → ${angle}° (overshoot +${LEVEL_OVERSHOOT}° for 200ms)`);
}

/**
 * Nudge needle up (small incremental adjustment)
 * Arrow keys provide fine control, not level jumps
 */
function stepUp() {
    // Nudge target angle up by small amount
    const newTarget = targetAngle + ARROW_STEP_DEGREES;
    const maxAllowed = LEVELS[8] + 20; // Can nudge slightly past Level 8

    targetAngle = Math.min(newTarget, maxAllowed);

    // Ensure animation loop is running
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(springStep);
    }

    console.log(`Nudge up → ${targetAngle.toFixed(1)}°`);
}

/**
 * Nudge needle down (small incremental adjustment)
 * Arrow keys provide fine control, not level jumps
 */
function stepDown() {
    // Nudge target angle down by small amount
    const newTarget = targetAngle - ARROW_STEP_DEGREES;
    const minAllowed = LEVELS[1]; // Can't go below Level 1

    targetAngle = Math.max(newTarget, minAllowed);

    // Ensure animation loop is running
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(springStep);
    }

    console.log(`Nudge down → ${targetAngle.toFixed(1)}°`);
}

/**
 * Reset to Level 1
 */
function reset() {
    setNeedleToLevel(1);
}

/**
 * Trigger rightward applause pump
 * Each press adds charge that shifts the target right, building with repeated taps
 */
function triggerWobble() {
    // Add charge (stacks with repeated presses)
    applauseCharge += WOBBLE_CONFIG.chargeStep;
    applauseCharge = Math.min(WOBBLE_CONFIG.maxOverdrive, applauseCharge);

    // Also add a velocity kick for immediate responsiveness
    const kick = Math.random() * WOBBLE_CONFIG.kick;
    velocity += kick;

    // Enter applause mode with reduced damping
    wobbleUntil = performance.now() + WOBBLE_CONFIG.durationMs;

    // Ensure animation loop is running
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(springStep);
    }

    console.log(`Applause charge: ${applauseCharge.toFixed(1)}°`);
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
