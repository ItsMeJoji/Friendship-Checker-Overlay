# Pokémon Friendship Overlay

A dynamic Twitch chat overlay that displays Pokémon sprites for viewers based on their messages. Viewers can trigger special events like Dynamax or Pokémon rerolls using Channel Points.

## Features
- **Real-time Pokémon Display**: Pokémon sprites appear when viewers chat.
- **Special Users**: Predefined Pokémon for specific users (e.g., Blastoise for itsmejoji).
- **Channel Point Integration (WIP)**: Trigger events like Dynamax or Pokémon rerolls.
- **User-Specific Pokémon**: Users keep the same Pokémon unless they reroll.
- **Shiny Pokémon**: 10% chance for a Pokémon to be shiny.
- **Message Display**: Last message appears above the Pokémon.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

### 3. Configure Channel Points
1. Go to your [Twitch Channel Points Management](https://dashboard.twitch.tv/u/{username}/points/rewards).
2. Create or edit rewards with the following exact titles:
   - `Pokemon Overlay Reroll`
   - `Shiny Pokemon Overlay Reroll`
   - `Dynamax!`
   - `Choose Your Pokemon on the Overlay!`
3. Ensure the rewards are enabled and have the correct point costs.

## Usage

### URL Parameters
- `?username=your_channel_name`: Sets the Twitch channel to connect to.
- `?client_id=your_client_id`: Sets the Twitch Client ID for API access.

### Commands
- `!spawn`: (Admin only) Spawns a test Pokémon.
- `!reset`: (Admin only) Clears all Pokémon from the overlay.

## Project Structure
- `src/main.js`: Entry point, handles TMI connection and initialization.
- `src/pokemonManager.js`: Manages Pokémon spawning, updates, and Channel Point redemption handling.
- `src/twitchService.js`: Handles Twitch API authentication and EventSub connections.
- `src/assetsLoader.js`: Loads and caches Pokémon sprites.
- `src/availablePokemon.js`: List of available Pokémon.
- `src/config.js`: Configuration and URL parameter handling.
- `src/state.js`: Global state management.

## Development

### Adding New Pokémon
1. Add the Pokémon name to `src/availablePokemon.js`.
2. Ensure the sprite exists in `public/pokemon/` with the correct filename (e.g., `blastoise.png`).

### Handling Channel Point Redemptions
1. Open `src/twitchService.js`.
2. Modify the `handleChannelPointRedemption` function to add new reward logic.
3. Ensure the reward titles match exactly what you set up in Twitch.

## License
MIT