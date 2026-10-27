import tmi from 'tmi.js';
import { state } from './state.js';
import { CONFIG, getUrlParameter } from './config.js';
import { addPokemon, spawnTestPokemon, resetOverlay, checkPokemonMessage } from './pokemonManager.js';
import { loop, nudgeSprites } from './renderer.js';
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

    // Only redirect if we have no token at all
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

        // This now handles both initial spawn and message updates
        addPokemon(chatter, message);

        const cleanCmd = message.trim().toLowerCase().split(/\s+/)[0];

        if (cleanCmd === '!jump') {
            const p = state.pokemon.find(p => p.username === username);
            if (p) {
                const currentSpeed = Math.hypot(p.vx, p.vy) || CONFIG.baseSpeed;
                p.vy = -Math.abs(p.vy || 1) - 4;
                p.vx = (p.vx >= 0 ? 1 : -1) * currentSpeed;
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
            if (message.trim() === '!nudge') {
                nudgeSprites();
            }
        }

        if (cleanCmd === '!checkpokemon') {
            checkPokemonMessage(username);
        }
    });

    // Connect to EventSub
    if (token) {
        connectToEventSub(token, username, clientId);
        console.log('EventSub Connected.');
    } else {
        console.log('No token found. Skipping EventSub connection.');
    }

    // Start Loop
    loop();
}

function connectToEventSub(token, username, clientId) {
    const socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // Stage 1: Welcome message provides the Session ID
        if (data.metadata.message_type === 'session_welcome') {
            sessionId = data.payload.session.id;
            console.log('EventSub Connected. Session ID:', sessionId);

            // Immediately tell Twitch what to listen for
            subscribeToRedemptions(token, username, clientId);
        }

        // Stage 2: Handle actual Redemption events
        if (data.metadata.message_type === 'notification') {
            const eventData = data.payload.event;
            console.log('Redemption Triggered:', eventData.reward.title);

            // Trigger a spawn for the person who redeemed
            handleRedemption(eventData);
        }
    };
}

async function subscribeToRedemptions(token, username, clientId) {
    // A. Get your Broadcaster ID (numeric ID)
    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId }
    });
    
    if (userRes.status === 401) {
        console.error('Twitch API 401 Unauthorized when fetching user. Clearing token to force re-auth.');
        localStorage.removeItem('access_token');
        return;
    }
    
    const userData = await userRes.json();

    if (!userData || !userData.data || !userData.data.length) {
        console.error('Twitch API Error or user not found:', userData);
        return;
    }

    const broadcasterId = userData.data[0].id;
    
    // Fetch external emotes (7TV, BTTV)
    fetchExternalEmotes(broadcasterId);

    // B. Register the Redemption Subscription
    const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
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

    if (res.status === 401) {
        console.error('Twitch API 401 Unauthorized. Clearing token to force re-auth.');
        localStorage.removeItem('access_token');
        // Optionally redirect to auth:
        // window.location.reload();
    } else {
        const subData = await res.json();
        console.log('Subscription response:', subData);
    }
}


init();
