import tmi from 'tmi.js';
import { state } from './state.js';
import { CONFIG, getUrlParameter } from './config.js';
import { addPokemon, spawnTestPokemon, resetOverlay } from './pokemonManager.js';
import { loop } from './renderer.js';
import { retrieveAccessToken, authTwitch, getAccessTokenFromUrl, storeAccessToken } from './utils.js';
import { handleRedemption } from './redemptionManager.js';

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

    // 3. ONLY redirect if we have absolutely no token at all
    if (!token) {
        console.log("No token found, redirecting to Twitch...");
        authTwitch(clientId, redirectUri);
        return;
    }

    const obsUrl = `${window.location.origin}${window.location.pathname}#access_token=${token}&username=${CONFIG.username}`;
    console.log("COPY THIS INTO OBS BROWSER SOURCE:");
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
        const chatter = { user_name: username };

        // This now handles both initial spawn and message updates
        addPokemon(chatter, message);

        // Commands
        if (username === 'itsmejoji') {
            if (message.trim() === '!spawn') spawnTestPokemon();
            if (message.trim() === '!reset') resetOverlay();
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
    const userData = await userRes.json();

    if (!userData) {
        console.error('Twitch API Error:', userData);
        return;
    }

    const broadcasterId = userData.data[0].id;

    // B. Register the Redemption Subscription
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
