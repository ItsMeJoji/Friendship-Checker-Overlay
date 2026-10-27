import { state } from './state.js';
import { CONFIG } from './config.js';

// --- Parade Configuration Settings ---
// Distance from the bottom of the 1080 canvas to the bottom of the sprite.
// 45px leaves space for the 20px username text + stroke + bottom padding.
export const PARADE_BOTTOM_OFFSET = 45;

// Hopping animation settings
export const HOP_SPEED = 0.010;   // Cadence of the hop (higher = faster hops)
export const DYNAMAX_HOP_SPEED_MULTIPLIER = 0.5; // Multiplier when Dynamaxed (0.5 = half speed)
export const HOP_HEIGHT = 8;      // Maximum height of each hop in pixels

// Walking horizontal speed range (pixels per frame)
export const WALK_SPEED_MIN = 1.2;
export const WALK_SPEED_MAX = 1.8;

export function update() {
    state.pokemon.forEach((p) => {
        // Animate scale
        if (p.currentScale === undefined) p.currentScale = 1;
        if (p.targetScale === undefined) p.targetScale = 1;
        p.currentScale += (p.targetScale - p.currentScale) * 0.05;

        const scale = p.currentScale || 1;
        const width = p.img.width * scale;
        const height = p.img.height * scale;

        // Position on a singular plane at the bottom
        const groundY = CONFIG.canvasHeight - height - PARADE_BOTTOM_OFFSET;

        // Jump & Drop Physics
        if (p.jumpVy === undefined) p.jumpVy = 0;

        // Initial spawn drop: start above the screen so they drop in from the top
        if (!p.spawnInitialized) {
            p.spawnInitialized = true;
            p.hasLanded = false;
            p.y = -height - 20;
            p.jumpVy = 0;
        }

        // Apply gravity
        p.jumpVy += 0.8;
        p.y += p.jumpVy;

        // Floor collision & grounding
        if (p.y >= groundY) {
            p.y = groundY;
            p.jumpVy = 0;
            p.hasLanded = true;
        } else if (p.hasLanded && p.jumpVy === 0) {
            // Keep anchored to the ground once landed if not jumping (e.g. during scale changes)
            p.y = groundY;
        }

        const isMessaging = Date.now() < p.messageTimer;
        const speedMult = p.speedMultiplier || 1;

        // Ensure a natural walking speed in parade mode (horizontal movement)
        if (!p.vx || Math.abs(p.vx) > (WALK_SPEED_MAX + 0.7) || Math.abs(p.vx) < (WALK_SPEED_MIN - 0.4)) {
            p.vx = (p.vx && p.vx < 0 ? -1 : 1) * (WALK_SPEED_MIN + Math.random() * (WALK_SPEED_MAX - WALK_SPEED_MIN));
        }

        p.x += p.vx * speedMult;

        // Bounce edges
        if (p.x + width >= CONFIG.canvasWidth || p.x <= 0) {
            p.vx *= -1;
            p.x = Math.max(0, Math.min(p.x, CONFIG.canvasWidth - width));
        }

        // Sync message DOM element
        if (p.msgElement) {
            if (isMessaging) {
                const centerX = p.x + width / 2;
                const textY = p.y - 15;
                p.msgElement.style.transform = `translate(${centerX}px, ${textY}px) translate(-50%, -100%)`;
                p.msgElement.style.display = 'block';
            } else {
                p.msgElement.style.display = 'none';
            }
        }
    });
}

export function draw() {
    state.ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    const now = Date.now();

    state.pokemon.forEach(p => {
        const scale = p.currentScale !== undefined ? p.currentScale : 1;
        const w = p.img.width * scale;
        const h = p.img.height * scale;

        // Hopping animation: quick vertical hop while walking on the ground
        const animOffset = p.animOffset !== undefined ? p.animOffset : (p.id || 0);
        const isDynamax = p.isDynamaxed || (p.targetScale && p.targetScale > 1);
        const currentHopSpeed = isDynamax ? (HOP_SPEED * DYNAMAX_HOP_SPEED_MULTIPLIER) : HOP_SPEED;
        const hopPhase = (now * currentHopSpeed) + animOffset;

        const groundY = CONFIG.canvasHeight - h - PARADE_BOTTOM_OFFSET;
        const isGrounded = p.hasLanded && Math.abs(p.jumpVy) < 0.1 && Math.abs(p.y - groundY) <= 2;
        const hopY = isGrounded ? -Math.abs(Math.sin(hopPhase)) * HOP_HEIGHT : 0;

        const centerX = p.x + w / 2;
        const centerY = p.y + h / 2 + hopY;

        // Draw Image (flipped horizontally based on velocity direction)
        state.ctx.save();
        state.ctx.translate(centerX, centerY);
        if (p.vx > 0) {
            state.ctx.scale(-1, 1);
        }
        state.ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
        state.ctx.restore();

        // Draw Username
        state.ctx.font = "bold 20px Arial";
        state.ctx.fillStyle = "white";
        state.ctx.textAlign = "center";
        state.ctx.strokeStyle = "black";
        state.ctx.lineWidth = 4;

        const textX = p.x + w / 2;
        const textY = p.y + h + 24; // Positioned right below sprite, leaving space before container bottom

        state.ctx.strokeText(p.username, textX, textY);
        state.ctx.fillText(p.username, textX, textY);
    });
}

export function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
