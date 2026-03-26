export function toProperCase(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capitalizeAllWords(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(toProperCase).join(' ');
}

export function storeAccessToken(token) {
    localStorage.setItem('access_token', token);
}

export function retrieveAccessToken() {
    return localStorage.getItem('access_token');
}

export function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

export async function saveUserPokemonData(username, pokemonData) {
    const storedData = JSON.parse(localStorage.getItem('userPokemonData') || '{}');
    storedData[username] = pokemonData;
    localStorage.setItem('userPokemonData', JSON.stringify(storedData));
    return true;
}

export async function loadUserPokemonData(username) {
    const storedData = JSON.parse(localStorage.getItem('userPokemonData') || '{}');
    return storedData[username];
}
