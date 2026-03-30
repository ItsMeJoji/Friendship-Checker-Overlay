import { state } from './state.js';
import { addPokemon } from './pokemonManager.js';
import { CONFIG } from './config.js';

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

        case "Dynamax My Pokemon":
            const p = state.pokemon.find(p => p.username === user);
            if (p) {
                p.isDynamaxed = true;
                p.message = "DYNAMAX POWER!";
                p.messageTimer = Date.now() + 5000;

                // Optional: Auto-shrink after the duration in CONFIG
                setTimeout(() => {
                    p.isDynamaxed = false;
                }, CONFIG.dynamaxDuration || 15000);
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