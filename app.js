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
    chargeDecay: 0.985    // decay per frame once applause ends (slower fallback)
};

// Arrow key nudge amount (small incremental adjustments)
const ARROW_STEP_DEGREES = 5;

// Idle needle motion (subtle "alive" oscillation when at rest)
const IDLE_CONFIG = {
    amplitude: 0.4,   // degrees
    speed: 0.0012     // radians per ms
};

// Six discrete preset levels - tick-based mapping
// Full dial sweep: 40 equal ticks from -135° to +115° (250° range, 6.25° per tick)
// Level 1 = tick #4 (10% into sweep, slightly below 8 o'clock)
// Level 6 = tick #40 (100%, far-right maximum)
// Levels 2-5 evenly spaced (7.2 ticks apart)
const LEVELS = {
    1: -110,  // Tick #4 - grounded start, slightly below 8 o'clock
    2: -65,   // Tick #11.2 - rising
    3: -20,   // Tick #18.4 - approaching noon
    4: 25,    // Tick #25.6 - past noon, building
    5: 70,    // Tick #32.8 - strong
    6: 115    // Tick #40 - peak, far-right maximum
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
    // Use SVG transform attribute with rotation center at (957.03, 764.11)
    needle.setAttribute('transform', `rotate(${angle} 957.03 764.11)`);
}

/**
 * Spring physics animation step
 */
function springStep() {
    const now = performance.now();

    // Decay applause charge when not actively applauding
    if (now >= wobbleUntil) {
        applauseCharge *= WOBBLE_CONFIG.chargeDecay;
        // Snap to zero when very small
        if (Math.abs(applauseCharge) < 0.1) {
            applauseCharge = 0;
        }
    }

    // Calculate spring force using effective target (includes applause charge)
    const effectiveTarget = targetAngle + applauseCharge;
    const displacement = effectiveTarget - currentAngle;
    const springForce = displacement * SPRING_CONFIG.stiffness;

    // Calculate damping force
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
    const maxAngle = Math.max(
        LEVELS[6] + 30,  // global ceiling (a little past Level 6)
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

            const idleAngle = Math.min(currentAngle + idleOffset, LEVELS[6] + 20);
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
 * Nudge needle up (small incremental adjustment)
 * Arrow keys provide fine control, not level jumps
 */
function stepUp() {
    // Nudge target angle up by small amount
    const newTarget = targetAngle + ARROW_STEP_DEGREES;
    const maxAllowed = LEVELS[6] + 20; // Can nudge slightly past Level 6

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
