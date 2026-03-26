function generateFriendshipURL() {
    const baseUrl = "https://itsmejoji.github.io/StreamAssets/friendship-checker.html";
    const params = new URLSearchParams();

    for (let i = 1; i <= 6; i++) {
        let pokemon = document.getElementById(`pokemon${i}`).value;
        const shiny = document.getElementById(`shiny${i}`).checked;
        if (pokemon) {
            if (shiny) {
                pokemon += '-s';
            }
            params.append(`pokemon${i}`, pokemon);
        }
    }

    if (document.getElementById('friendship').checked) {
        params.append('friendship', 'true');
    }
    if (document.getElementById('overlay').checked) {
        params.append('overlay', 'true');
    }
    if (document.getElementById('dsSize').checked) {
        params.append('ds', 'true');
    }

    if (document.getElementById('scale').value) {
        params.append('scale', document.getElementById('scale').value);
    }

    const fullUrl = `${baseUrl}?${params.toString()}`;
    document.getElementById('generatedFriendshipURL').textContent = fullUrl;
}
function resetFriendship(){
    document.getElementById('generatedFriendshipURL').textContent = '';
    document.getElementById('friendshipForm').reset();
}