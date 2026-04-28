export const state = {
    pokemon: [], // Array of { id, username, pokemonName, x, y, vx, vy, image, isDynamaxed, message, messageTimer, dynamaxTimeoutId, speedTimeoutId }
    imagesCache: new Map(),
    externalEmotes: new Map(), // Map of emote code -> { url, provider }
    client: null,
    canvas: null,
    ctx: null,
    bufferCanvas: null,
    bufferCtx: null,
};
