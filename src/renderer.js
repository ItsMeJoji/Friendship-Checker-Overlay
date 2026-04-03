import { state } from './state.js';
import { CONFIG } from './config.js';

function drawWrappedText(ctx, text, x, base_y, maxChars, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let i = 0; i < words.length; i++) {
        let testLine = line + words[i] + ' ';
        if (testLine.length > maxChars && line !== '') {
            lines.push(line.trim());
            line = words[i] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    // Draw lines upwards so they stack above the Pokemon
    lines.reverse().forEach((l, index) => {
        ctx.strokeText(l, x, base_y - (index * lineHeight));
        ctx.fillText(l, x, base_y - (index * lineHeight));
    });
}

export function update() {
    state.pokemon.forEach((p, index) => {
        // Move
        const speedMult = p.speedMultiplier || 1;
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Animate scale
        if (p.currentScale === undefined) p.currentScale = 1;
        if (p.targetScale === undefined) p.targetScale = 1;
        p.currentScale += (p.targetScale - p.currentScale) * 0.05;

        // Bounce edges
        const width = p.img.width * p.currentScale;
        const height = p.img.height * p.currentScale;

        if (p.x + width >= CONFIG.canvasWidth || p.x <= 0) {
            p.vx *= -1;
            p.x = Math.max(0, Math.min(p.x, CONFIG.canvasWidth - width));
        }
        if (p.y + height >= CONFIG.canvasHeight || p.y <= 0) {
            p.vy *= -1;
            p.y = Math.max(0, Math.min(p.y, CONFIG.canvasHeight - height));
        }

        // Simple Collision
        for (let i = index + 1; i < state.pokemon.length; i++) {
            const p2 = state.pokemon[i];
            const p2Scale = p2.currentScale || 1;
            const dx = (p.x + width/2) - (p2.x + (p2.img.width * p2Scale)/2);
            const dy = (p.y + height/2) - (p2.y + (p2.img.height * p2Scale)/2);
            const distance = Math.hypot(dx, dy);
            const minSourceDist = (width + (p2.img.width * p2Scale)) / 4;

            if (distance < minSourceDist) {
                // Reverse velocities
                p.vx *= -0.8; p.vy *= -0.8;
                p2.vx *= -0.8; p2.vy *= -0.8;
                
                // Nudge apart to prevent sticking
                const angle = Math.atan2(dy, dx);
                p.x += Math.cos(angle) * 2;
                p.y += Math.sin(angle) * 2;
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
        const textY = p.y + h + 25;
        
        state.ctx.strokeText(p.username, textX, textY);
        state.ctx.fillText(p.username, textX, textY);

        // Draw Message (skip if it contains a URL or bare domain like poketrainer.tools)
        const hasLink = /https?:\/\/|www\.|\b[a-z\d][\w-]*\.[a-z]{2,}/i.test(p.message);
        if (p.message && !hasLink && Date.now() < p.messageTimer) {
            state.ctx.fillStyle = "yellow";
            state.ctx.font = "bold 24px Arial";
            drawWrappedText(state.ctx, p.message, textX, p.y - 10, 20, 28);
        }
    });
}

export function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
