import { state } from './state.js';

export async function fetchExternalEmotes(broadcasterId) {
    if (!broadcasterId) return;

    console.log(`Fetching external emotes for broadcaster ID: ${broadcasterId}`);

    // Fetch in order of increasing precedence so later ones overwrite earlier ones
    // 1. BTTV Global
    await fetchBTTVGlobalEmotes();
    // 2. BTTV Channel
    await fetchBTTVChannelEmotes(broadcasterId);
    // 3. 7TV Global
    await fetch7TVGlobalEmotes();
    // 4. 7TV Channel
    await fetch7TVChannelEmotes(broadcasterId);

    console.log(`Loaded ${state.externalEmotes.size} external emotes.`);
}

async function fetchBTTVGlobalEmotes() {
    try {
        const response = await fetch('https://api.betterttv.net/3/cached/emotes/global', { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const emotes = await response.json();
        console.log(`BTTV Global: Found ${emotes.length} emotes.`);
        emotes.forEach(emote => {
            state.externalEmotes.set(emote.code, {
                url: `https://cdn.betterttv.net/emote/${emote.id}/1x`,
                provider: 'bttv'
            });
        });
    } catch (e) {
        console.error('Failed to fetch BTTV Global emotes:', e);
    }
}

async function fetchBTTVChannelEmotes(broadcasterId) {
    try {
        const response = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        let count = 0;
        if (data.channelEmotes) {
            count += data.channelEmotes.length;
            data.channelEmotes.forEach(emote => {
                state.externalEmotes.set(emote.code, {
                    url: `https://cdn.betterttv.net/emote/${emote.id}/1x`,
                    provider: 'bttv'
                });
            });
        }
        if (data.sharedEmotes) {
            count += data.sharedEmotes.length;
            data.sharedEmotes.forEach(emote => {
                state.externalEmotes.set(emote.code, {
                    url: `https://cdn.betterttv.net/emote/${emote.id}/1x`,
                    provider: 'bttv'
                });
            });
        }
        console.log(`BTTV Channel: Found ${count} emotes.`);
    } catch (e) {
        console.error('Failed to fetch BTTV Channel emotes:', e);
    }
}

async function fetch7TVGlobalEmotes() {
    try {
        // 7TV Global Emote Set ID
        const response = await fetch('https://7tv.io/v3/emote-sets/60686c2d106606680456c382', { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        if (data.emotes) {
            console.log(`7TV Global: Found ${data.emotes.length} emotes.`);
            data.emotes.forEach(emote => {
                state.externalEmotes.set(emote.name, {
                    url: `https:${emote.data.host.url}/1x.webp`,
                    provider: '7tv'
                });
            });
        } else {
            console.log('7TV Global: No emotes found in set.');
        }
    } catch (e) {
        console.error('Failed to fetch 7TV Global emotes:', e);
    }
}

async function fetch7TVChannelEmotes(broadcasterId) {
    try {
        const response = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        if (data.emote_set && data.emote_set.emotes) {
            console.log(`7TV Channel: Found ${data.emote_set.emotes.length} emotes.`);
            data.emote_set.emotes.forEach(emote => {
                state.externalEmotes.set(emote.name, {
                    url: `https:${emote.data.host.url}/1x.webp`,
                    provider: '7tv'
                });
            });
        } else {
            console.log('7TV Channel: No emotes found for this user.');
        }
    } catch (e) {
        console.error('Failed to fetch 7TV Channel emotes:', e);
    }
}
