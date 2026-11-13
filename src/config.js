export function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    let val = params.get(name);
    if (val) localStorage.setItem(name, val);
    return val || localStorage.getItem(name) || '';
}

export const CONFIG = {
    canvasWidth: 1920,
    canvasHeight: 1080,
    baseSpeed: 1.5,
    speedAdjust: 1,
    padding: 50,
    collisionSize: 60,
    dynamaxDuration: 60000,
    username: getUrlParameter('username'), // Store channel name here
    client_id: getUrlParameter('client_id') || localStorage.getItem('saved_client_id') || '',
    streamerbot_ws: getUrlParameter('sb_ws') || localStorage.getItem('sb_ws') || 'ws://127.0.0.1:8080/',
    streamerbot_enabled: getUrlParameter('sb_enabled') !== 'false' && localStorage.getItem('sb_enabled') !== 'false',
    specialUsers: {
        'itsmejoji': 'blastoise-s',
        'nightbot': 'porygon-z-s',
        'porygon_bot_': 'porygon-s',
        'thomkeeris': 'sableye',
        'sirtoastyt': 'scizor-s',
        'cherrius_': 'deoxys',
        'welcome2therage': 'zygarde-complete-s',
        'sd_z_yt2': 'gengar-mega-s',
        'katfreak101': 'liepard-s'
    }
};
