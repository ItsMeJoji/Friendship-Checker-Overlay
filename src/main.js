import tmi from 'tmi.js';
import { state } from './state.js';
import { CONFIG, getUrlParameter } from './config.js';
import { addPokemon, spawnTestPokemon, resetOverlay, checkPokemonMessage } from './pokemonManager.js';
import { loop, nudgeSprites } from './renderer.js';
import { retrieveAccessToken, authTwitch, getAccessTokenFromUrl, storeAccessToken } from './utils.js';
import { handleRedemption } from './redemptionManager.js';
import { fetchExternalEmotes } from './emoteManager.js';
import { saveStreamerConfig, loadStreamerConfig, clearStreamerToken } from './firebaseStorage.js';

let sessionId = '';

async function init() {
    state.canvas = document.getElementById('mainCanvas');
    state.ctx = state.canvas.getContext('2d');
    state.bufferCanvas = document.getElementById('bufferCanvas');
    state.bufferCtx = state.bufferCanvas.getContext('2d');

    const username = CONFIG.username;
    let clientId = CONFIG.client_id;
    const redirectUri = window.location.origin + window.location.pathname;

    const urlParams = new URLSearchParams(window.location.search);
    const forceAuth = urlParams.get('force_auth') === 'true';

    let token = getAccessTokenFromUrl();

    if (token) {
        storeAccessToken(token);
        if (username) {
            await saveStreamerConfig(username, { token, ...(clientId ? { clientId } : {}) });
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } else if (forceAuth) {
        localStorage.removeItem('access_token');
        token = null;
    } else {
        token = retrieveAccessToken();
    }

    // If missing token or missing clientId, try loading from Firebase
    if (username && (!clientId || !token)) {
        const cloudConfig = await loadStreamerConfig(username);
        if (cloudConfig) {
            if (!clientId && cloudConfig.clientId) {
                clientId = cloudConfig.clientId;
                CONFIG.client_id = clientId;
                localStorage.setItem('client_id', clientId);
                console.log(`[Firebase] Loaded saved Twitch clientId for ${username}:`, clientId);
            }
            if (!forceAuth && !token && cloudConfig.token && !cloudConfig.tokenInvalid) {
                token = cloudConfig.token;
                storeAccessToken(token);
                console.log(`[Firebase] Loaded saved Twitch credentials for ${username}`);
            }
        }
    }

    // Only redirect if we have no token at all
    if (!token) {
        if (!clientId) {
            console.error("Missing clientId or stored credentials to authenticate with Twitch. Please open /help/ to authorize.");
            return;
        }
        console.log("No valid token found, redirecting to Twitch...");
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
    if (!token || !clientId) {
        console.warn('[EventSub] Missing token or clientId. EventSub cannot connect.');
        return;
    }

    let socket = null;
    let reconnectTimer = null;

    function openSocket(wsUrl = 'wss://eventsub.wss.twitch.tv/ws') {
        if (socket) {
            try { socket.close(); } catch (_) {}
        }

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('[EventSub] WebSocket connection opened.');
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                // Stage 1: Welcome message provides Session ID
                if (data.metadata?.message_type === 'session_welcome') {
                    sessionId = data.payload.session.id;
                    console.log('[EventSub] Connected. Session ID:', sessionId);
                    await subscribeToRedemptions(token, username, clientId);
                }

                // Stage 2: Handle Twitch EventSub reconnection
                if (data.metadata?.message_type === 'session_reconnect') {
                    const reconnectUrl = data.payload?.session?.reconnect_url;
                    console.log('[EventSub] Twitch requested reconnect:', reconnectUrl);
                    if (reconnectUrl) {
                        openSocket(reconnectUrl);
                    }
                }

                // Stage 3: Handle actual Redemption events
                if (data.metadata?.message_type === 'notification') {
                    const eventData = data.payload?.event;
                    console.log('[EventSub] Redemption Triggered:', eventData?.reward?.title);
                    handleRedemption(eventData);
                }

                // Stage 4: Keepalive
                if (data.metadata?.message_type === 'session_keepalive') {
                    // Connection is healthy
                }
            } catch (err) {
                console.error('[EventSub] Error processing WebSocket message:', err);
            }
        };

        socket.onerror = (err) => {
            console.error('[EventSub] WebSocket error:', err);
        };

        socket.onclose = (event) => {
            console.warn(`[EventSub] WebSocket closed (code ${event.code}). Reconnecting in 5s...`);
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                openSocket('wss://eventsub.wss.twitch.tv/ws');
            }, 5000);
        };
    }

    openSocket();
}

async function subscribeToRedemptions(token, username, clientId) {
    try {
        // A. Get Broadcaster ID (numeric ID)
        const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId }
        });

        if (userRes.status === 401) {
            console.error('[Twitch API] 401 Unauthorized: Access token is invalid or expired. Clearing token.');
            localStorage.removeItem('access_token');
            if (username) {
                await clearStreamerToken(username);
            }
            return;
        }

        const userData = await userRes.json();
        if (!userData?.data?.length) {
            console.error('[Twitch API] User not found or error fetching user:', userData);
            return;
        }

        const broadcasterId = userData.data[0].id;
        console.log(`[Twitch API] Broadcaster ID for ${username}: ${broadcasterId}`);

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
            console.error('[EventSub] 401 Unauthorized while subscribing. Token may lack channel:read:redemptions scope.');
            localStorage.removeItem('access_token');
            if (username) {
                await clearStreamerToken(username);
            }
            return;
        }

        if (res.status === 409) {
            console.log('[EventSub] Subscription already active for this session.');
            return;
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('[EventSub] Subscription failed with status', res.status, errData);
            return;
        }

        const subData = await res.json();
        console.log('[EventSub] Subscribed to redemptions successfully:', subData);
    } catch (err) {
        console.error('[EventSub] Error setting up redemption subscription:', err);
    }
}


init();
