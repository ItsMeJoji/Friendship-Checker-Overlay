import tmi from 'tmi.js';
import { state } from './state.js';
import { CONFIG, getUrlParameter } from './config.js';
import { addPokemon, spawnTestPokemon, resetOverlay, checkPokemonMessage } from './pokemonManager.js';
import { loop } from './parade-renderer.js';
import { retrieveAccessToken, authTwitch, getAccessTokenFromUrl, storeAccessToken } from './utils.js';
import { handleRedemption } from './redemptionManager.js';
import { fetchExternalEmotes } from './emoteManager.js';

let sessionId = '';

async function init() {
    state.canvas = document.getElementById('mainCanvas');
    state.ctx = state.canvas.getContext('2d');
    state.bufferCanvas = document.getElementById('bufferCanvas');
    state.bufferCtx = state.bufferCanvas.getContext('2d');

    const username = CONFIG.username;
    const clientId = CONFIG.client_id;
    const redirectUri = window.location.origin + window.location.pathname;

    let token = getAccessTokenFromUrl();

    if (token) {
        storeAccessToken(token);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } else {
        token = retrieveAccessToken();
    }

    if (!token) {
        console.log("No token found, redirecting to Twitch...");
        authTwitch(clientId, redirectUri);
        return;
    }

    // Connect to Twitch
    state.client = new tmi.Client({
        options: { debug: true, skipUpdatingEmotesets: true },
        connection: { reconnect: true, secure: true },
        channels: [username]
    });

    state.client.connect().catch(console.error);

    state.client.on('message', (channel, tags, message, self) => {
        const username = tags.username;
        const chatter = { user_name: username, emotes: tags.emotes };

        addPokemon(chatter, message);

        if (message.trim() === '!jump') {
            const p = state.pokemon.find(p => p.username === username);
            if (p) {
                // Determine if they are close to the ground to allow jumping
                const scale = p.currentScale || 1;
                const height = p.img.height * scale;
                const groundY = CONFIG.canvasHeight - height - 100;

                // Allow jump if they are within 10 pixels of the ground (or exactly on it)
                if (Math.abs(p.y - groundY) <= 10) {
                    const roll = Math.random();
                    if (roll < 0.01) {
                        p.jumpVy = -35;
                    } else if (roll < 0.11) {
                        p.jumpVy = -20;
                    } else {
                        p.jumpVy = -10;
                    }
                }
            }
        }

        // Commands
        if (username === 'itsmejoji') {
            if (message.trim() === '!spawn') spawnTestPokemon();
            if (message.trim() === '!reset') resetOverlay();
            if (message.trim() === '!dynamax') {
                handleRedemption({ reward: { title: "Dynamax!" }, user_login: username });
            }
            if (message.trim() === '!speed') {
                handleRedemption({ reward: { title: "X-Speed!" }, user_login: username });
            }
        }

        if (message.trim().toLowerCase() === '!checkpokemon') {
            checkPokemonMessage(username);
        }
    });

    // Connect to EventSub
    if (token) {
        connectToEventSub(token, username, clientId);
        console.log('EventSub Connected.');
    }

    // Start Loop
    loop();
}

function connectToEventSub(token, username, clientId) {
    const socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.metadata.message_type === 'session_welcome') {
            sessionId = data.payload.session.id;
            subscribeToRedemptions(token, username, clientId);
        }
        if (data.metadata.message_type === 'notification') {
            handleRedemption(data.payload.event);
        }
    };
}

async function subscribeToRedemptions(token, username, clientId) {
    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId }
    });
    const userData = await userRes.json();
    if (!userData?.data?.length) return;
    const broadcasterId = userData.data[0].id;
    
    // Fetch external emotes (7TV, BTTV)
    fetchExternalEmotes(broadcasterId);

    await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Client-Id': clientId,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'channel.channel_points_custom_reward_redemption.add',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: { method: 'websocket', session_id: sessionId }
        })
    });
}

init();
