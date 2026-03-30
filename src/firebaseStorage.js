import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Saves a user's Pokémon to the cloud.
 */
export async function savePokemonToCloud(username, pokemonName) {
    try {
        await set(ref(db, 'users/' + username), {
            storedPokemon: pokemonName,
            lastUpdated: Date.now()
        });
    } catch (error) {
        console.error("Firebase Save Error:", error);
    }
}

/**
 * Retrieves a user's Pokémon from the cloud.
 */
export async function loadPokemonFromCloud(username) {
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${username}`));
        if (snapshot.exists()) {
            return snapshot.val().storedPokemon;
        }
        return null;
    } catch (error) {
        console.error("Firebase Load Error:", error);
        return null;
    }
}