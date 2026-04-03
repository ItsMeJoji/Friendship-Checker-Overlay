import { state } from './state.js';
import { addPokemon } from './pokemonManager.js';
import { CONFIG } from './config.js';
import { getPokemonSpritePath, loadAndCropImage } from './assetsLoader.js';

/**
 * Main entry point for processing EventSub notifications.
 * Called from your socket.onmessage in main.js
 */
export function handleRedemption(eventData) {
    const rewardTitle = eventData.reward.title;
    const user = eventData.user_login;
    const chatter = { user_name: user };

    console.log(`[Redemption] ${user} used: ${rewardTitle}`);

    // Map your Twitch Reward Titles to specific actions
    switch (rewardTitle) {
        case "Pokemon Overlay Reroll":
            // Normal spawn
            addPokemon(chatter, `I redeemed ${rewardTitle}!`, { forceReroll: true });
            break;

        case "Shiny Pokemon Overlay Reroll":
            // Force a shiny by appending '-s' to a random or stored name
            // We'll pass a flag or handle it in a custom way
            addPokemon(chatter, `I redeemed ${rewardTitle}!`, { forceReroll: true, increaseShinyChance: true });
            break;

        case "Dynamax!":
            console.log(`[Redemption] ${user} used Dynamax!`);

            const applyDynamax = async (pokemon) => {
                pokemon.targetScale = 3;
                pokemon.messageTimer = Date.now() + 5000;
                
                if (!pokemon.msgElement) {
                    pokemon.msgElement = document.createElement('div');
                    pokemon.msgElement.className = 'pokemon-message';
                    document.getElementById('container').appendChild(pokemon.msgElement);
                }
                pokemon.msgElement.innerHTML = `${user} used Dynamax!`;
                pokemon.msgElement.style.display = 'block';

                // Load GMAX form if available
                const baseNameRe = /-gmax$/; // sanity check
                // Construct the GMAX name
                const isShiny = pokemon.pokemonName.endsWith('-s');
                const baseIdentifier = pokemon.pokemonName.replace('-s', '');
                
                // Construct the potential gmax name
                let gmaxName = isShiny ? `${baseIdentifier}-gmax-s` : `${baseIdentifier}-gmax`;
                
                const gmaxPath = getPokemonSpritePath(gmaxName);
                const gmaxImg = await loadAndCropImage(gmaxName, gmaxPath);

                if (gmaxImg) {
                    pokemon.originalImg = pokemon.img;
                    pokemon.img = gmaxImg;
                    pokemon.msgElement.innerHTML = `${user} used Gigantamax!`;
                }

                setTimeout(() => {
                    pokemon.targetScale = 1;
                    if (pokemon.originalImg) {
                        pokemon.img = pokemon.originalImg;
                        pokemon.originalImg = null;
                    }
                }, CONFIG.dynamaxDuration || 60000);
            };

            let p = state.pokemon.find(p => p.username === user);
            if (p) {
                applyDynamax(p);
            } else {
                addPokemon(chatter, "DYNAMAX POWER!").then(() => {
                    let newP = state.pokemon.find(p => p.username === user);
                    if (newP) applyDynamax(newP);
                });
            }
            break;

        case "X-Speed!":
            console.log(`[Redemption] ${user} used X-Speed!`);

            const applySpeed = (pokemon) => {
                pokemon.speedMultiplier = 5.0; // 5x speed
                pokemon.messageTimer = Date.now() + 5000;
                
                if (!pokemon.msgElement) {
                    pokemon.msgElement = document.createElement('div');
                    pokemon.msgElement.className = 'pokemon-message';
                    document.getElementById('container').appendChild(pokemon.msgElement);
                }
                pokemon.msgElement.innerHTML = `${user} used an X-Speed!`;
                pokemon.msgElement.style.display = 'block';

                setTimeout(() => {
                    pokemon.speedMultiplier = 1;
                }, 60000);
            };

            let px = state.pokemon.find(p => p.username === user);
            if (px) {
                applySpeed(px);
            } else {
                addPokemon(chatter, "X-SPEED!").then(() => {
                    let newPx = state.pokemon.find(p => p.username === user);
                    if (newPx) applySpeed(newPx);
                });
            }
            break;

        default:
            // Fallback for any other reward: just show the message
            addPokemon(chatter, `Redeemed: ${rewardTitle}`);
            break;
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