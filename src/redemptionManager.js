import { state } from './state.js';
import { addPokemon } from './pokemonManager.js';
import { CONFIG } from './config.js';
import { getPokemonSpritePath, loadAndCropImage } from './assetsLoader.js';

/**
 * Main entry point for processing EventSub notifications.
 * Called from your socket.onmessage in main.js
 */
export function handleRedemption(eventData) {
    if (!eventData) return;

    const rewardTitle = (eventData.reward?.title || '').trim();
    const user = (eventData.user_login || eventData.user_name || eventData.user || '').toLowerCase();
    const chatter = { user_name: user };

    console.log(`[Redemption] ${user} used: ${rewardTitle}`);

    const normalizedTitle = rewardTitle.toLowerCase().replace(/!/g, '').trim();

    if (normalizedTitle.includes('shiny') && (normalizedTitle.includes('reroll') || normalizedTitle.includes('pokemon'))) {
        addPokemon(chatter, `I redeemed ${rewardTitle}!`, { forceReroll: true, increaseShinyChance: true });
    } else if (normalizedTitle.includes('reroll')) {
        addPokemon(chatter, `I redeemed ${rewardTitle}!`, { forceReroll: true });
    } else if (normalizedTitle === 'dynamax' || normalizedTitle.includes('dynamax') || normalizedTitle.includes('gigantamax')) {
        console.log(`[Redemption] ${user} used Dynamax!`);

        const applyDynamax = async (pokemon) => {
            if (pokemon.dynamaxTimeoutId) {
                clearTimeout(pokemon.dynamaxTimeoutId);
            }

            pokemon.isDynamaxed = true;
            pokemon.targetScale = 3;
            const duration = CONFIG.dynamaxDuration || 60000;
            pokemon.messageTimer = Date.now() + 5000;

            if (!pokemon.msgElement) {
                pokemon.msgElement = document.createElement('div');
                pokemon.msgElement.className = 'pokemon-message';
                document.getElementById('container').appendChild(pokemon.msgElement);
            }
            pokemon.msgElement.innerHTML = `${user} used Dynamax!`;
            pokemon.msgElement.style.display = 'block';

            // Load GMAX form if available
            const isShiny = pokemon.pokemonName.endsWith('-s');
            const baseIdentifier = pokemon.pokemonName.replace('-s', '');
            let gmaxName = isShiny ? `${baseIdentifier}-gmax-s` : `${baseIdentifier}-gmax`;

            const gmaxPath = getPokemonSpritePath(gmaxName);
            const gmaxImg = await loadAndCropImage(gmaxName, gmaxPath);

            if (gmaxImg) {
                pokemon.originalImg = pokemon.originalImg || pokemon.img;
                pokemon.img = gmaxImg;
                pokemon.msgElement.innerHTML = `${user} used Gigantamax!`;
            }

            pokemon.dynamaxTimeoutId = setTimeout(() => {
                pokemon.targetScale = 1;
                pokemon.isDynamaxed = false;
                if (pokemon.originalImg) {
                    pokemon.img = pokemon.originalImg;
                    pokemon.originalImg = null;
                }
                pokemon.dynamaxTimeoutId = null;
            }, duration);
        };

        let p = state.pokemon.find(p => p.username.toLowerCase() === user);
        if (p) {
            applyDynamax(p);
        } else {
            addPokemon(chatter, "DYNAMAX POWER!").then(() => {
                let newP = state.pokemon.find(p => p.username.toLowerCase() === user);
                if (newP) applyDynamax(newP);
            });
        }
    } else if (normalizedTitle === 'x-speed' || normalizedTitle === 'xspeed' || normalizedTitle.includes('speed')) {
        console.log(`[Redemption] ${user} used X-Speed!`);

        const applySpeed = (pokemon) => {
            if (pokemon.speedTimeoutId) {
                clearTimeout(pokemon.speedTimeoutId);
            }

            pokemon.speedMultiplier = 5.0; // 5x speed
            pokemon.messageTimer = Date.now() + 5000;

            if (!pokemon.msgElement) {
                pokemon.msgElement = document.createElement('div');
                pokemon.msgElement.className = 'pokemon-message';
                document.getElementById('container').appendChild(pokemon.msgElement);
            }
            pokemon.msgElement.innerHTML = `${user} used an X-Speed!`;
            pokemon.msgElement.style.display = 'block';

            pokemon.speedTimeoutId = setTimeout(() => {
                pokemon.speedMultiplier = 1;
                pokemon.speedTimeoutId = null;
            }, 60000);
        };

        let px = state.pokemon.find(p => p.username.toLowerCase() === user);
        if (px) {
            applySpeed(px);
        } else {
            addPokemon(chatter, "X-SPEED!").then(() => {
                let newPx = state.pokemon.find(p => p.username.toLowerCase() === user);
                if (newPx) applySpeed(newPx);
            });
        }
    } else {
        addPokemon(chatter, `Redeemed: ${rewardTitle}`);
    }
}

async function handleSpecialSpawn(chatter, forceShiny) {
    // This calls your existing addPokemon logic, 
    // but we can ensure it's shiny before it hits the manager.
    // Since addPokemon picks a random one if none is stored:
    if (forceShiny) {
        // You could modify pokemonManager to accept a 'shiny' override, 
        // or just trigger the spawn and then modify the last added one.
        await addPokemon(chatter, "✨ SHINY REDEMPTION! ✨");
        const p = state.pokemon.find(p => p.username === chatter.user_name);
        if (p && !p.pokemonName.endsWith('-s')) {
            p.pokemonName += '-s';
            // Note: You'd need to re-load the image in a real scenario
        }
    }
}