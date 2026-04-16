# Pokémon Friendship Overlay

A dynamic Twitch chat overlay that brings Pokémon to your stream! Viewers can spawn their own Pokémon, chat through them, and use Channel Points for special effects.

## ✨ Features

- **Classic Mode**: Pokémon bounce around the screen with collisions.
- **Parade Mode**: Pokémon walk horizontally along the bottom of the screen.
- **Twitch Integration**: Real-time chat messages appear.
- **Channel Point Rewards**: Trigger Dynamax, X-Speed, or Rerolls.
- **Shiny Luck**: Every spawn has a chance to be shiny!

## 🚀 Getting Started

The easiest way to set up your overlay is using the built-in **Help Page**. It includes a link generator to help you create the perfect URL for OBS.

1. **Launch the Help Page**: Navigate to `https://itsmejoji.github.io/Friendship-Checker-Overlay/help/` in your browser.
2. **Generate your Link**: Enter your Twitch username and Client ID.
3. **Authorize**: Follow the Twitch login prompts.
4. **Add to OBS**: Copy the final URL from the browser console and add it as a **Browser Source** (1920x1080).


## 💎 Channel Point Setup

To enable interactivity, create rewards with these **exact** titles:

- `Pokemon Overlay Reroll`: Changes the user's current Pokémon.
- `Shiny Pokemon Overlay Reroll`: Forces a shiny reroll.
- `Dynamax!`: Grows the Pokémon and triggers its GMAX form (if available).
- `X-Speed!`: Gives the Pokémon a temporary speed boost.

## 🛠 Commands

- `!spawn`: (Broadcaster only) Spawns a random test Pokémon.
- `!reset`: (Broadcaster only) Clears all Pokémon from the screen.
- `!nudge`: (Broadcaster only) Resets all Pokémon back to their base speed.

## 📦 Project Structure

- `index.html` / `parade/index.html`: Main entry points for the different modes.
- `help/index.html`: Self-hosted setup guide and link generator.
- `src/renderer.js` / `src/parade-renderer.js`: Movement and rendering systems.
- `src/pokemonManager.js`: Pokémon spawning and message handling.
- `src/redemptionManager.js`: Twitch EventSub reward handling.

## 📜 License
MIT