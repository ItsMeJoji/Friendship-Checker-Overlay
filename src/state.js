export const state = {
    pokemon: [], // Array of { id, username, pokemonName, x, y, vx, vy, image, isDynamaxed, message, messageTimer }
    imagesCache: new Map(),
    client: null,
    canvas: null,
    ctx: null,
    bufferCanvas: null,
    bufferCtx: null,
};
