/**
 * GOOD-OMETER - Live Event Projection Controller
 * Keyboard-operated analog gauge with discrete preset levels
 */

// State
let currentLevel = 1;
let isAnimating = false;
let isWobbling = false;

// Six discrete preset levels with corresponding needle angles (in degrees)
// Gauge range: -135° (left/resting) to +135° (right/fully charged)
const LEVELS = {
    1: -135,  // Resting
    2: -80,   // Slightly Rising
    3: 0,     // Halfway
    4: 80,    // Strong Movement
    5: 120,   // Near the Top
    6: 135    // Fully Charged
};

// DOM elements
const needle = document.getElementById('needle');
const helpOverlay = document.getElementById('help-overlay');

/**
 * Initialize the app
 */
function init() {
    // Set initial needle position (Level 1)
    setNeedleToLevel(1, false);

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
        setNeedleToLevel(level, true);
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
 * Set needle to a specific level
 * @param {number} level - Target level (1-6)
 * @param {boolean} animate - Whether to animate the transition
 */
function setNeedleToLevel(level, animate = true) {
    // Validate level
    if (level < 1) level = 1;
    if (level > 6) level = 6;

    // Don't do anything if already at this level
    if (level === currentLevel && !animate) return;

    currentLevel = level;
    const angle = LEVELS[level];

    if (animate) {
        // Add animating class for smooth transition
        needle.classList.add('animating');

        // Apply rotation
        needle.style.transform = `rotate(${angle}deg)`;

        // Store current angle for wobble effect
        needle.style.setProperty('--current-angle', `${angle}deg`);

        // Remove animating class after animation completes
        setTimeout(() => {
            needle.classList.remove('animating');
            isAnimating = false;
        }, 400);

        isAnimating = true;
    } else {
        // Instant positioning (no animation)
        needle.style.transform = `rotate(${angle}deg)`;
        needle.style.setProperty('--current-angle', `${angle}deg`);
    }

    console.log(`Level ${level} (${angle}°)`);
}

/**
 * Step up one level
 */
function stepUp() {
    if (currentLevel < 6 && !isAnimating) {
        setNeedleToLevel(currentLevel + 1, true);
    }
}

/**
 * Step down one level
 */
function stepDown() {
    if (currentLevel > 1 && !isAnimating) {
        setNeedleToLevel(currentLevel - 1, true);
    }
}

/**
 * Reset to Level 1
 */
function reset() {
    if (!isAnimating) {
        setNeedleToLevel(1, true);
    }
}

/**
 * Trigger applause wobble effect
 * Needle wiggles subtly but doesn't change levels
 */
function triggerWobble() {
    if (isWobbling) return;

    isWobbling = true;
    needle.classList.add('wobbling');

    setTimeout(() => {
        needle.classList.remove('wobbling');
        isWobbling = false;
    }, 400);

    console.log('Applause wobble!');
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
