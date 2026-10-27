import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

let authPromise = null;

/**
 * Ensures the client is authenticated with Firebase using the configured credentials.
 */
export async function ensureAuth() {
    if (auth.currentUser) return auth.currentUser;
    if (authPromise) return authPromise;

    const email = import.meta.env.VITE_FIREBASE_AUTH_EMAIL;
    const password = import.meta.env.VITE_FIREBASE_AUTH_PASSWORD;

    if (!email || !password) {
        return null;
    }

    authPromise = signInWithEmailAndPassword(auth, email.trim(), password.trim())
        .then((credential) => {
            console.log(`[Firebase] Authenticated as ${credential.user.email} (UID: ${credential.user.uid})`);
            return credential.user;
        })
        .catch((error) => {
            console.error("[Firebase] Auth Sign-In Error:", error);
            authPromise = null;
            return null;
        });

    return authPromise;
}

// Automatically initiate authentication on load
ensureAuth();

/**
 * Saves a user's Pokémon to the cloud.
 */
export async function savePokemonToCloud(username, pokemonName) {
    try {
        await ensureAuth();
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
        await ensureAuth();
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

/**
 * Saves a streamer's configuration (tokens, client IDs, etc.) to the cloud.
 */
export async function saveStreamerConfig(username, config) {
    if (!username) return;
    try {
        await ensureAuth();
        await set(ref(db, 'configs/' + username.toLowerCase()), {
            ...config,
            lastUpdated: Date.now()
        });
        console.log(`[Firebase] Saved streamer configuration for ${username}.`);
    } catch (error) {
        console.error("Firebase Config Save Error:", error);
    }
}

/**
 * Retrieves a streamer's configuration from the cloud.
 */
export async function loadStreamerConfig(username) {
    if (!username) return null;
    try {
        await ensureAuth();
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `configs/${username.toLowerCase()}`));
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error("Firebase Config Load Error:", error);
        return null;
    }
}