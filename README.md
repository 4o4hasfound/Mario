# Web Mario — CS2410 Software Studio Assignment 02

A Super Mario Bros. style platformer game built with **Cocos Creator 2.4.8**.

## Features

### ✅ Complete Game Process (5%)
- **Start Menu**: Title screen with animated title and start button
- **Level Select**: Level selection screen with locked/unlocked level states
- **Game View**: Full gameplay with game start and game over handling
- **Game flow**: Menu → Level Select → Game → Game Over/Level Clear → Retry/Menu

### ✅ Basic Rules (50%)

#### World Map (10%)
- Correct physics properties using Box2D physics engine
- Gravity applied to all dynamic objects (player, enemies, items)
- Proper collision between different object types (player, ground, enemies, items)
- Background and camera follow the player's position with smooth lerp
- Camera clamped to level bounds
- 1 complete world map (World 1-1)

#### Level Design (5%)
- Static walls and ground tiles
- Pipes as obstacles
- Question blocks that interact with the player when hit from below
- Gaps/pits that act as hazards
- Elevated platforms and staircases

#### Player (15%)
- Correct physics properties (gravity, collision)
- Move left/right with Arrow Keys or A/D
- Jump with Space, Up Arrow, or W
- Takes damage when touching enemies from the side or below
- Dies and loses a life when falling out of bounds
- Respawns at initial position after death
- Smooth acceleration and deceleration

#### Enemies (15%)
- Correct physics properties
- **Goomba**: Patrols left/right, reverses at walls, dies when stomped (flattens)
- **Turtle (Koopa)**: Patrols, becomes shell when stomped, shell can be kicked to kill other enemies
- **Flower (Piranha Plant)**: Pops up and down from pipes periodically
- Only stomping (hitting from above) kills enemies

#### Question Blocks (5%)
- **Coin blocks**: Award 200 points + 1 coin when hit
- **Mushroom blocks**: Spawn a Super Mushroom that makes Mario bigger
- Bounce animation when hit
- Switch to "used" appearance after activation
- Blocks interact correctly with player (only from below)

### ✅ Animations (10%)
- **Player walk animation**: Multi-frame walking cycle (5%)
- **Player jump animation**: Distinct jump sprite frame
- **Player idle animation**: Standing frame
- **Player death animation**: Jump-up then fall-down tween
- **Player grow/shrink animation**: Flicker effect
- **Goomba walk animation**: 2-frame walking cycle (2%)
- **Turtle walk animation**: 2-frame walking cycle (2%)
- **Flower animation**: Pop up/down tween from pipe (1%)

### ✅ Sound Effects (10%)
- **BGM**: Background music that loops during gameplay (2%)
- **Jump SFX**: Sound when player jumps (1%)
- **Death SFX**: Sound when player dies (2%)
- **Stomp SFX**: Sound when stomping enemies
- **Coin SFX**: Sound when collecting coins (1%)
- **Power-up SFX**: Sound when collecting mushroom (1%)
- **Power-down SFX**: Sound when taking damage while big
- **Level Clear SFX**: Jingle when reaching the flag (1%)
- **Power-up appear SFX**: Sound when mushroom spawns from block (1%)
- All SFX play without stopping BGM

### ✅ UI (10%)
- **Player lives display**: Life icon with count (3%)
- **Player score display**: 6-digit padded score counter (5%)
- **Timer**: Countdown from 300 seconds with red flash warning (2%)
- **Coin counter**: Coin count display
- **Game Over screen**: Score summary + Retry/Menu buttons
- **Level Clear screen**: Score + time bonus + Next/Menu buttons
- **Pause**: Press ESC or P to pause/resume

### ✅ Appearance (10%)
- Mario sprite sheets for small and big forms
- Enemy sprites (Goomba, Turtle, Flower)
- Tile-based level with ground, bricks, pipes, and question blocks
- UI buttons with hover/press states
- Score popup effects
- Parallax background scrolling
- Invincibility flicker effect
- Smooth camera following with bounds

### ✅ Bonus (10%)
- **Firebase (5%)**:
  - Sign up and Login with Firebase Authentication.
  - Save/restore game progress (high scores) automatically upon login.
- **Leaderboard (5%)**:
  - Global leaderboard fetching the top 10 players' scores from Firestore.

## Controls

| Key | Action |
|---|---|
| ← / A | Move left |
| → / D | Move right |
| Space / ↑ / W | Jump |
| ESC / P | Pause / Resume |

## Technical Details

- **Engine**: Cocos Creator 2.4.8
- **Physics**: Box2D (built-in)
- **Language**: TypeScript
- **Resolution**: 960×640

## Project Structure

```
assets/
├── scripts/
│   ├── GameManager.ts      — Singleton game state manager
│   ├── AudioManager.ts     — BGM and SFX manager
│   ├── Player.ts           — Player controller + physics + animation
│   ├── CameraFollow.ts     — Smooth camera following
│   ├── Enemy.ts            — Goomba, Turtle, Flower enemies
│   ├── QuestionBlock.ts    — Interactive question blocks
│   ├── Mushroom.ts         — Super Mushroom power-up
│   ├── Coin.ts             — Coin collectible
│   ├── UIManager.ts        — In-game HUD
│   ├── StartMenu.ts        — Start menu scene
│   ├── LevelSelect.ts      — Level selection scene
│   ├── KillZone.ts         — Out-of-bounds death zone
│   ├── FlagPole.ts         — End-of-level flag
│   ├── LevelBuilder.ts     — Runtime level construction
│   └── LevelData.ts        — Level configuration data
├── AS2_source/             — TA-provided assets
│   ├── audio/              — BGM and SFX files
│   ├── player/             — Mario sprite sheets
│   ├── enemies/            — Enemy sprite sheets
│   ├── effects_UI_tiles/   — Tile and UI sprites
│   ├── pictures/           — UI images and backgrounds
│   └── fonts/              — Bitmap fonts
└── scenes/
    ├── StartMenu.fire      — Start menu scene
    ├── LevelSelect.fire    — Level selection scene
    └── Game.fire           — Main game scene
```

## How to Build

1. Open the project in Cocos Creator 2.4.8
2. Go to **Project → Build** 
3. Select **Web Mobile** as the platform
4. Click **Build** then **Run**
