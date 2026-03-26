import { state } from './state.js';
import { CONFIG } from './config.js';
import { availablePokemon } from './availablePokemon.js';
import { getPokemonSpritePath, loadAndCropImage } from './assetsLoader.js';
import { saveUserPokemonData, capitalizeAllWords } from './utils.js';

export function getRandomPokemon() {
    return availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
}



export function spawnTestPokemon() {
    const testNames = ['Blastoise', 'Charizard', 'Venusaur', 'Pikachu', 'Eevee', 'Mewtwo'];
    const baseName = testNames[Math.floor(Math.random() * testNames.length)];
    const name = `${baseName}_${Math.floor(Math.random() * 1000)}`;
    addPokemon({ user_name: name }, "I'm a test Pokémon!");
}

export function resetOverlay() {
    state.pokemon = [];
}

export async function addPokemon(chatter, initialMessage = '') {
    const username = chatter.user_name || chatter.username || 'unknown';
    
    // If pokemon already exists, just update message and return
    const existing = state.pokemon.find(p => p.username === username);
    if (existing) {
        if (initialMessage) {
            existing.message = initialMessage;
            existing.messageTimer = Date.now() + 5000;
        }
        return;
    }

    let pokemonName = chatter.storedPokemon || getRandomPokemon();
    if (CONFIG.specialUsers[username]) {
        pokemonName = CONFIG.specialUsers[username];
    }

    // Shiny chance (1/10)
    if (!pokemonName.includes("-s") && Math.random() < 0.1) {
        pokemonName += '-s';
    }

    const spritePath = getPokemonSpritePath(pokemonName);
    const img = await loadAndCropImage(pokemonName, spritePath);

    if (!img) return;

    state.pokemon.push({
        id: Date.now() + Math.random(),
        username: username,
        pokemonName: pokemonName,
        x: Math.random() * (CONFIG.canvasWidth - 100),
        y: Math.random() * (CONFIG.canvasHeight - 100),
        vx: (Math.random() * 2 - 1) * CONFIG.speedAdjust,
        vy: (Math.random() * 2 - 1) * CONFIG.speedAdjust,
        img: img,
        isDynamaxed: false,
        message: initialMessage,
        messageTimer: initialMessage ? Date.now() + 5000 : 0
    });
}
