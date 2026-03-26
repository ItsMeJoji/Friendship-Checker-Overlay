
async function fetchPokemonData(pokemonName) {
    try {
        const encounterResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}/encounters`);
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`);
        if (!encounterResponse.ok) {
            throw new Error('Pokemon not found');
        }
        const data = await encounterResponse.json();
        let versionName;
        let locationName;
        let shinyStatus;
        let allData = [];

        data.forEach(pokemonData => {
            pokemonData.version_details.forEach(nameValue => {
                versionName = nameValue.version.name;
                locationName = pokemonData.location_area.name;
                shinyStatus = "Data not available";
                allData.push({versionName, locationName, shinyStatus});
            });
        });

        return allData;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

async function lookupPokemon() {
    const searchedPokemonName = document.getElementById('pokemonName').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';


    if (searchedPokemonName){
        const pokemonData = fetchPokemonData(searchedPokemonName);
        console.log(pokemonData);
        if (pokemonData){
            let htmlContent = '';
            htmlContent += `
            <button type="button" class="collapsible">Test</button>
            <div class="content">
            `;
            htmlContent += `
            <p><strong>Location:</strong></p>
            `;
            htmlContent += `
            <p><strong>Encounter Type:</strong></p>
            <p><strong>Min Level:</strong></p>
            <p><strong>Max Level:</strong></p>
            <p><strong>Encounter Rate:</strong>%</p>
            <hr>
            `;
            htmlContent += `</div>`;
        
            // Re-attach event listeners for the new collapsible buttons
            const coll = document.getElementsByClassName("collapsible");
            for (let i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function() {
                    this.classList.toggle("active");
                    const content = this.nextElementSibling;
                    if (content.style.maxHeight){
                        content.style.maxHeight = null;
                        } else {
                        content.style.maxHeight = content.scrollHeight + "px";
                        }
                });
            }
        }
        else {
            resultsDiv.innerHTML = '<p>No encounter data found for this Pokemon.</p>';
        }
    
        resultsDiv.innerHTML = htmlContent;
    }         else {
        resultsDiv.innerHTML = '<p>Please enter a Pokemon name.</p>';
    }
    
}
