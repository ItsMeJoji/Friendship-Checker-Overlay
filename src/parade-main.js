import tmi from 'tmi.js';
import { state } from './state.js';
import { CONFIG, getUrlParameter } from './config.js';
import { addPokemon, spawnTestPokemon, resetOverlay, checkPokemonMessage } from './pokemonManager.js';
import { loop, PARADE_BOTTOM_OFFSET } from './parade-renderer.js';
import { retrieveAccessToken, authTwitch, getAccessTokenFromUrl, storeAccessToken } from './utils.js';
import { handleRedemption } from './redemptionManager.js';
import { fetchExternalEmotes } from './emoteManager.js';
import { saveStreamerConfig, loadStreamerConfig } from './firebaseStorage.js';

let sessionId = '';

async function init() {
    state.canvas = document.getElementById('mainCanvas');
    state.ctx = state.canvas.getContext('2d');
    state.bufferCanvas = document.getElementById('bufferCanvas');
    state.bufferCtx = state.bufferCanvas.getContext('2d');

    const username = CONFIG.username;
    let clientId = CONFIG.client_id;
    const redirectUri = window.location.origin + window.location.pathname;

    let token = getAccessTokenFromUrl();

    if (token) {
        storeAccessToken(token);
        if (username) {
            await saveStreamerConfig(username, { token, clientId: clientId || undefined });
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } else {
        token = retrieveAccessToken();
        if (token && username) {
            saveStreamerConfig(username, { token, clientId: clientId || undefined });
        }
    }

    // If no token locally (e.g. running in an OBS browser source), load from Firebase
    if (!token && username) {
        const cloudConfig = await loadStreamerConfig(username);
        if (cloudConfig?.token) {
            token = cloudConfig.token;
            clientId = clientId || cloudConfig.clientId;
            if (clientId && !CONFIG.client_id) {
                CONFIG.client_id = clientId;
            }
            storeAccessToken(token);
            console.log(`[Firebase] Loaded saved Twitch credentials for ${username}`);
        }
    }

    if (!token) {
        if (!clientId) {
            console.error("Missing clientId or stored credentials to authenticate with Twitch.");
            return;
        }
        console.log("No token found, redirecting to Twitch...");
        authTwitch(clientId, redirectUri);
        return;
    }

    const obsUrl = `${window.location.origin}${window.location.pathname}?username=${CONFIG.username}`;
    console.log("OBS BROWSER SOURCE URL (token synced via cloud):");
    console.log(obsUrl);

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

        const cleanCmd = message.trim().toLowerCase().split(/\s+/)[0];

        if (cleanCmd === '!jump') {
            const p = state.pokemon.find(p => p.username === username);
            if (p) {
                // Determine if they are close to the ground (or jumpVy is 0) to allow jumping
                const scale = p.currentScale || 1;
                const height = (p.img ? p.img.height : 100) * scale;
                const groundY = CONFIG.canvasHeight - height - PARADE_BOTTOM_OFFSET;

                // Allow jump if on ground, jumpVy is 0, or within 25px of the ground plane
                const isNearGround = (p.jumpVy === 0 || p.jumpVy === undefined) || Math.abs(p.y - groundY) <= 25;
                if (isNearGround) {
                    const roll = Math.random();
                    if (roll < 0.01) {
                        p.jumpVy = -35;
                    } else if (roll < 0.11) {
                        p.jumpVy = -22;
                    } else {
                        p.jumpVy = -13;
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
