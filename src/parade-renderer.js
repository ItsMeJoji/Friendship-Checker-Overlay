import { state } from './state.js';
import { CONFIG } from './config.js';

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
        // We leave space for the name (approx 50px) and some bottom padding
        const groundY = CONFIG.canvasHeight - height - 100; 
        p.y = groundY;

        const isMessaging = Date.now() < p.messageTimer;
        const speedMult = p.speedMultiplier || 1;
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

    state.pokemon.forEach(p => {
        const scale = p.currentScale !== undefined ? p.currentScale : 1;
        const w = p.img.width * scale;
        const h = p.img.height * scale;

        // Draw Image (flipped based on velocity)
        state.ctx.save();
        if (p.vx > 0) {
            state.ctx.translate(p.x + w, p.y);
            state.ctx.scale(-1, 1);
            state.ctx.drawImage(p.img, 0, 0, w, h);
        } else {
            state.ctx.drawImage(p.img, p.x, p.y, w, h);
        }
        state.ctx.restore();

        // Draw Username
        state.ctx.font = "bold 20px Arial";
        state.ctx.fillStyle = "white";
        state.ctx.textAlign = "center";
        state.ctx.strokeStyle = "black";
        state.ctx.lineWidth = 4;
        
        const textX = p.x + w / 2;
        const textY = p.y + h + 25; // Closer to the sprite, matching main overlay
        
        state.ctx.strokeText(p.username, textX, textY);
        state.ctx.fillText(p.username, textX, textY);
    });
}

export function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
