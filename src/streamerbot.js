import { CONFIG } from './config.js';

/**
 * Initializes connection to Streamer.bot's WebSocket server to listen for YouTube events.
 * 
 * @param {Function} onMessage - Callback triggered on incoming YouTube chat message: ({ username, message, isOwner, isSuperChat, rawEvent }) => void
 * @param {Object} [options] - Optional overrides for connection settings
 * @returns {{ close: Function } | null} Controller to disconnect or null if disabled
 */
export function initStreamerBot(onMessage, options = {}) {
    if (CONFIG.streamerbot_enabled === false) {
        console.log('[Streamer.bot] Integration disabled by configuration.');
        return null;
    }

    const wsUrl = options.url || CONFIG.streamerbot_ws || 'ws://127.0.0.1:8080/';
    let socket = null;
    let reconnectTimer = null;
    let isExplicitlyClosed = false;

    function connect() {
        if (isExplicitlyClosed) return;

        try {
            console.log(`[Streamer.bot] Connecting to WebSocket at ${wsUrl}...`);
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log(`[Streamer.bot] Connected successfully to ${wsUrl}. Subscribing to YouTube events...`);
                // Subscribe to YouTube events: Message and SuperChat
                const subscribePayload = {
                    request: 'Subscribe',
                    id: 'friendship-overlay-youtube',
                    events: {
                        YouTube: [
                            'Message',
                            'SuperChat'
                        ]
                    }
                };
                socket.send(JSON.stringify(subscribePayload));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Subscription confirmation acknowledgment
                    if (data.status === 'ok') {
                        console.log(`[Streamer.bot] Event subscription confirmed (id: ${data.id || 'N/A'}).`);
                        return;
                    }

                    const source = data.event?.source;
                    const type = data.event?.type;

                    if (source === 'YouTube') {
                        if (type === 'Message') {
                            const payload = data.data;
                            const message = payload?.message || '';
                            const user = payload?.user || {};
                            const username = user.name || user.login || 'YouTubeUser';
                            const isOwner = Boolean(user.isOwner);

                            if (onMessage && message) {
                                onMessage({
                                    username,
                                    message,
                                    isOwner,
                                    isSuperChat: false,
                                    rawEvent: data
                                });
                            }
                        } else if (type === 'SuperChat') {
                            const payload = data.data;
                            const message = payload?.comment || payload?.message || '';
                            const user = payload?.user || {};
                            const username = user.name || user.login || 'YouTubeUser';
                            const isOwner = Boolean(user.isOwner);

                            if (onMessage && message) {
                                onMessage({
                                    username,
                                    message,
                                    isOwner,
                                    isSuperChat: true,
                                    rawEvent: data
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error('[Streamer.bot] Error parsing message payload:', err);
                }
            };

            socket.onerror = () => {
                console.warn('[Streamer.bot] WebSocket error. Make sure Streamer.bot is running with its WebSocket server enabled on port 8080.');
            };

            socket.onclose = (event) => {
                if (isExplicitlyClosed) return;
                console.warn(`[Streamer.bot] Connection closed (code ${event.code}). Retrying in 5s...`);
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connect, 5000);
            };
        } catch (err) {
            console.error('[Streamer.bot] Failed to initialize WebSocket:', err);
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 5000);
        }
    }

    connect();

    return {
        close: () => {
            isExplicitlyClosed = true;
            clearTimeout(reconnectTimer);
            if (socket) {
                try { socket.close(); } catch (_) {}
            }
        }
    };
}

