# Software Studio Assignment 2 - Web Mario

Student ID: 113062206

- **Game Hosting:** [https://mario-3f46d.web.app](https://mario-3f46d.web.app)
- **GitHub Repository:** [https://github.com/4o4hasfound/Mario](https://github.com/4o4hasfound/Mario)

## Completed Features

### 1. Complete Game Process
- Made a start menu, level select screen, and the main game view.
- The game can transition smoothly between the menu, game over, and level clear screens.

### 2. Basic Rules
- **World Map:** Added gravity and collisions. The camera follows Mario as he moves.
- **Level Design:** Created static walls, question blocks, and pipes.
- **Player:** Mario can walk and jump using the keyboard. He takes damage from enemies, dies if he falls down a hole, and respawns properly.
- **Enemies:** Added Goomba, Turtle. You can kill them by jumping on their heads
- **Question Blocks:** Hitting blocks from below gives coins or a mushroom that makes Mario grow big.

### 3. Animations
- Mario has walk, jump, and idle animations.
- Goomba and Koopa have walking animations. 
- The Piranha Plant has an animation for popping out of the pipe.

### 4. Sound Effects
- Added background music.
- Added sound effects for jump, die.
- The sound effects play without stopping the BGM.

### 5. UI
- The screen shows Mario's current lives, total score, and a countdown timer.
- Added panels for pausing, game over, and clearing the level.

### 6. Bonus Features
- **Firebase:** Added Firebase Authentication so users can sign up and login. The game automatically saves and restores high scores to the cloud.
- **Leaderboard:** Made a global leaderboard that fetches and displays the top 10 scores from Firestore on the start menu.

## Controls
- **A / D** or **Left / Right Arrows**: Move left and right
- **W** or **Space** or **Up Arrow**: Jump
- **P** or **ESC**: Pause the game
