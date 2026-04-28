import { state } from './state.js';
import { CONFIG } from './config.js';
import { availablePokemon } from './availablePokemon.js';
import { getPokemonSpritePath, loadAndCropImage, parseAndPreloadEmotes } from './assetsLoader.js';
import { saveUserPokemonData, capitalizeAllWords } from './utils.js';
import { savePokemonToCloud, loadPokemonFromCloud } from './firebaseStorage.js';

export function checkPokemonMessage(username) {
    const p = state.pokemon.find(p => p.username === username);
    if (p) {
        const cleanName = p.pokemonName.replace('-s', '').replace(/-/g, ' ');
        const isShiny = p.pokemonName.includes('-s');
        const displayMessage = `I am ${isShiny ? 'a ✨ Shiny ' : 'a '}${capitalizeAllWords(cleanName)}!`;
        
        p.messageTimer = Date.now() + 5000;
        if (!p.msgElement) {
            const msg = document.createElement('div');
            msg.className = 'pokemon-message';
            document.getElementById('container').appendChild(msg);
            p.msgElement = msg;
        }
        p.msgElement.innerHTML = displayMessage;
        p.msgElement.style.display = 'block';
    }
}

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
    state.pokemon.forEach(p => {
        if (p.msgElement) {
            p.msgElement.remove();
        }
    });
    state.pokemon = [];
}

export async function addPokemon(chatter, initialMessage = '', options = {}) {
    const { forceReroll = false, increaseShinyChance = false } = options
    const username = chatter.user_name || chatter.username || 'unknown';

    let displayMessage = initialMessage;
    
    // Filter out commands (starts with ! and is the only word)
    if (displayMessage.trim().startsWith('!') && !displayMessage.trim().includes(' ')) {
        displayMessage = "";
    }

    // Filter out links
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    if (urlRegex.test(displayMessage)) {
        displayMessage = "";
    }

    if (displayMessage) {
        displayMessage = await parseAndPreloadEmotes(displayMessage, chatter.emotes);
    }

    // If pokemon already exists, just update message and return
    const existing = state.pokemon.find(p => p.username === username);
    if (existing && !forceReroll) {
        if (displayMessage) {
            existing.messageTimer = Date.now() + 5000;
            if (!existing.msgElement) {
                const msg = document.createElement('div');
                msg.className = 'pokemon-message';
                document.getElementById('container').appendChild(msg);
                existing.msgElement = msg;
            }
            // Update innerHTML
            existing.msgElement.innerHTML = displayMessage;
            existing.msgElement.style.display = 'block';
        }
        return;
    }

    let pokemonName;

    if (forceReroll) {
        pokemonName = getRandomPokemon();
    } else {
        const cloudPokemon = await loadPokemonFromCloud(username);
        pokemonName = cloudPokemon || chatter.storedPokemon || getRandomPokemon();
    }

    if (CONFIG.specialUsers[username]) {
        pokemonName = CONFIG.specialUsers[username];
    }

    // Shiny chance (1/100)
    let shinyChance = 0.01;
    if (increaseShinyChance) {
        // Increase shiny chance by 10x
        shinyChance *= 10;
    }
    let isShiny = false;
    if (!pokemonName.includes("-s") && Math.random() < shinyChance) {
        pokemonName += '-s';
        isShiny = true;
    }

    const spritePath = getPokemonSpritePath(pokemonName);
    const img = await loadAndCropImage(pokemonName, spritePath);

    if (!img) return;

    if (existing && forceReroll) {
        // UPDATE EXISTING POKEMON

        const cleanName = pokemonName.replace('-s', '').replace(/-/g, ' ');
        // We know this message doesn't have Twitch emotes, but we should escape it just in case if we used innerHTML. But since we construct it, it's fine.
        const displayRerollMessage = `I turned into ${isShiny ? 'a ✨ Shiny ' : 'a '}${capitalizeAllWords(cleanName)}!`;
        existing.pokemonName = pokemonName;
        existing.img = img;
        existing.messageTimer = Date.now() + 5000;
        
        if (!existing.msgElement) {
            const msg = document.createElement('div');
            msg.className = 'pokemon-message';
            document.getElementById('container').appendChild(msg);
            existing.msgElement = msg;
        }
        existing.msgElement.innerHTML = displayRerollMessage;
        existing.msgElement.style.display = 'block';

        // Save the new choice to localStorage
        saveUserPokemonData(username, { storedPokemon: pokemonName });
    } else {
        // SPAWN NEW POKEMON
        const messageTimer = displayMessage ? Date.now() + 5000 : 0;
        
        // Setup DOM element
        const msgElement = document.createElement('div');
        msgElement.className = 'pokemon-message';
        if (displayMessage) {
            msgElement.innerHTML = displayMessage;
            msgElement.style.display = 'block';
        }
        document.getElementById('container').appendChild(msgElement);

        state.pokemon.push({
            id: Date.now() + Math.random(),
            username: username,
            pokemonName: pokemonName,
            img: img,
            x: Math.random() * (CONFIG.canvasWidth - (img.width * 0.5)),
            y: Math.random() * (CONFIG.canvasHeight - (img.height * 0.5)),
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            speedMultiplier: 1,
            currentScale: 1,
            targetScale: 1,
            isDynamaxed: false,
            msgElement: msgElement,
            messageTimer: messageTimer
        });


    }

    savePokemonToCloud(username, pokemonName);
}
