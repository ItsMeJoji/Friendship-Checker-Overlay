import { state } from './state.js';

export function getPokemonSpritePath(pokemonName) {
    const base = import.meta.env.BASE_URL;
    let path = 'pokemon/';
    
    if (pokemonName.endsWith('-f-s')) {
        path += `shiny/female/${pokemonName.slice(0, -4)}`;
    } else if (pokemonName.endsWith('-f')) {
        path += `female/${pokemonName.slice(0, -2)}`;
    } else if (pokemonName.endsWith('-s')) {
        path += `shiny/${pokemonName.slice(0, -2)}`;
    } else {
        path += pokemonName;
    }
    
    return `${base}${path}.png`.replace(/\/+/g, '/'); // Ensure no double slashes
}

export async function loadAndCropImage(name, path) {
    if (state.imagesCache.has(name)) return state.imagesCache.get(name);

    return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            // Use buffer canvas to crop transparent edges
            state.bufferCanvas.width = img.width;
            state.bufferCanvas.height = img.height;
            state.bufferCtx.clearRect(0, 0, img.width, img.height);
            state.bufferCtx.drawImage(img, 0, 0);

            const imageData = state.bufferCtx.getImageData(0, 0, img.width, img.height);
            const pixels = imageData.data;
            let top = img.height, bottom = 0, left = img.width, right = 0;

            for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                    const alpha = pixels[(y * img.width + x) * 4 + 3];
                    if (alpha > 0) {
                        if (x < left) left = x;
                        if (x > right) right = x;
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                    }
                }
            }

            const newWidth = right - left + 1;
            const newHeight = bottom - top + 1;

            if (newWidth > 0 && newHeight > 0) {
                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = newWidth;
                croppedCanvas.height = newHeight;
                const croppedCtx = croppedCanvas.getContext('2d');
                croppedCtx.drawImage(state.bufferCanvas, left, top, newWidth, newHeight, 0, 0, newWidth, newHeight);
                
                const finalImg = new Image();
                finalImg.src = croppedCanvas.toDataURL();
                finalImg.onload = () => {
                    state.imagesCache.set(name, finalImg);
                    resolve(finalImg);
                };
            } else {
                state.imagesCache.set(name, img);
                resolve(img);
            }
        };
        img.onerror = () => {
            console.error(`Failed to load sprite: ${path}`);
            resolve(null);
        };
    });
}

export async function parseAndPreloadEmotes(message, emotes) {
    const escapeHtml = (unsafe) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    let replacements = [];

    // 1. Add Twitch Emotes
    if (emotes) {
        for (const [id, positions] of Object.entries(emotes)) {
            for (const pos of positions) {
                const [start, end] = pos.split('-').map(Number);
                replacements.push({ 
                    start, 
                    end, 
                    html: `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0" alt="emote" />` 
                });
            }
        }
    }

    // 2. Add External Emotes (7TV, BTTV)
    // We only check for external emotes if the word isn't already part of a Twitch emote
    if (state.externalEmotes.size > 0) {
        const wordMatches = message.matchAll(/\S+/g);
        for (const match of wordMatches) {
            const word = match[0];
            const start = match.index;
            const end = start + word.length - 1;

            // Check if this range overlaps with any Twitch emote
            const isOverlap = replacements.some(r => (start <= r.end && end >= r.start));
            if (!isOverlap) {
                const external = state.externalEmotes.get(word);
                if (external) {
                    replacements.push({
                        start,
                        end,
                        html: `<img src="${external.url}" alt="${word}" class="external-emote" />`
                    });
                }
            }
        }
    }

    // 3. Apply all replacements
    if (replacements.length === 0) {
        const isSingleWord = message.trim().split(/\s+/).length === 1;
        return escapeHtml(isSingleWord ? truncateText(message) : message);
    }

    replacements.sort((a, b) => a.start - b.start);

    let parsedMessage = '';
    let lastIndex = 0;

    for (const r of replacements) {
        // Append escaped text before the emote
        parsedMessage += escapeHtml(message.substring(lastIndex, r.start));
        // Append the img tag
        parsedMessage += r.html;
        lastIndex = r.end + 1;
    }
    // Append remaining escaped text
    parsedMessage += escapeHtml(message.substring(lastIndex));

    return parsedMessage;
}

function truncateText(text) {
    if (!text) return "";
    return text.split(' ').map(word => {
        if (word.length > 28) {
            return word.substring(0, 28) + "...";
        }
        return word;
    }).join(' ');
}
