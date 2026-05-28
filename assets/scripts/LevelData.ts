/**
 * LevelData — static level configuration data.
 *
 * Each level is a 2D tile grid plus enemy/item placement lists.
 * Tile IDs:
 *   0 = empty (air)
 *   1 = ground brick
 *   2 = breakable brick
 *   3 = question block (coin)
 *   4 = question block (mushroom)
 *   5 = pipe body (collidable)
 *   6 = pipe top (collidable)
 *   7 = hard block (indestructible, visual only)
 *   8 = invisible block (hidden ? block)
 *   9 = used block
 */

export interface EnemyDef {
    type: string;   // 'goomba' | 'turtle' | 'flower'
    col: number;    // tile column
    row: number;    // tile row (from bottom, 0 = ground level)
}

export interface CoinDef {
    col: number;
    row: number;
}

export interface LevelConfig {
    name: string;
    width: number;          // columns
    height: number;         // rows
    tileSize: number;       // pixels per tile
    tiles: number[][];      // [row][col], row 0 = bottom
    enemies: EnemyDef[];
    coins: CoinDef[];
    playerStartCol: number;
    playerStartRow: number;
    flagCol: number;
    flagRow: number;
    timeLimit: number;      // seconds
}

// ── Helper: create a row of ground (all 1s) ────────────────────────
function groundRow(w: number): number[] {
    return new Array(w).fill(1);
}

function emptyRow(w: number): number[] {
    return new Array(w).fill(0);
}

function makeGrid(width: number, height: number): number[][] {
    const grid: number[][] = [];
    for (let r = 0; r < height; r++) {
        grid.push(r < 2 ? groundRow(width) : emptyRow(width));
    }
    return grid;
}

// ── Simple Level ───────────────────────────────────────────────────
function buildLevel1(): LevelConfig {
    const W = 120; // Long enough to walk off after the flag
    const H = 15;
    const TILE = 32;
    const grid = makeGrid(W, H);

    // Just flat ground, no gaps, no complex platforms.

    // A single mushroom block
    grid[5][20] = 4;

    // A few enemies
    const enemies: EnemyDef[] = [
        { type: 'goomba', col: 30, row: 2 },
        { type: 'turtle', col: 45, row: 2 },
        { type: 'goomba', col: 60, row: 2 },
    ];

    const coins: CoinDef[] = [];

    return {
        name: 'Simple Flat Level',
        width: W,
        height: H,
        tileSize: TILE,
        tiles: grid,
        enemies,
        coins,
        playerStartCol: 15, // Spawn Mario further right so the camera is perfectly centered on him!
        playerStartRow: 2,
        flagCol: 75,
        flagRow: 2,
        timeLimit: 300,
    };
}

// ── Level 2: The Heights ───────────────────────────────────────────
function buildLevel2(): LevelConfig {
    const W = 150;
    const H = 15;
    const TILE = 32;
    const grid = makeGrid(W, H);

    // Add gaps in the ground
    for (let c = 25; c <= 28; c++) grid[0][c] = grid[1][c] = 0; // Gap 1
    for (let c = 50; c <= 54; c++) grid[0][c] = grid[1][c] = 0; // Gap 2
    for (let c = 80; c <= 85; c++) grid[0][c] = grid[1][c] = 0; // Gap 3
    
    // Add 4-block high and 5-block high pillars!
    // Ground is rows 0 and 1. So a 4-block high pillar reaches row 5 (2, 3, 4, 5).
    for (let r = 2; r <= 5; r++) grid[r][40] = 7; // Hard block pillar
    
    // 5-block high pillar:
    for (let r = 2; r <= 6; r++) grid[r][65] = 7; // Needs MAX jump to clear!
    
    // A platform area to jump onto
    for (let c = 95; c <= 105; c++) {
        grid[6][c] = 1; // Elevated ground
    }
    
    // Question blocks!
    grid[5][10] = 3; // Coin
    grid[5][11] = 4; // Mushroom
    grid[5][12] = 3; // Coin
    
    // Question block on elevated ground
    grid[9][100] = 4; // Mushroom

    const enemies: EnemyDef[] = [
        { type: 'goomba', col: 35, row: 2 },
        { type: 'turtle', col: 45, row: 2 },
        { type: 'goomba', col: 70, row: 2 },
        { type: 'turtle', col: 100, row: 7 }, // on elevated platform
    ];

    return {
        name: 'The Heights',
        width: W,
        height: H,
        tileSize: TILE,
        tiles: grid,
        enemies,
        coins: [],
        playerStartCol: 5,
        playerStartRow: 2,
        flagCol: 130,
        flagRow: 2,
        timeLimit: 300,
    };
}

// ── Level 3: The Towers ────────────────────────────────────────────
function buildLevel3(): LevelConfig {
    const W = 180;
    const H = 15;
    const TILE = 32;
    const grid = makeGrid(W, H);

    // Occasional gaps (maximum 5 blocks wide)
    for (let c = 20; c <= 24; c++) grid[0][c] = grid[1][c] = 0; // 4 block gap
    for (let c = 45; c <= 50; c++) grid[0][c] = grid[1][c] = 0; // 5 block gap
    for (let c = 80; c <= 84; c++) grid[0][c] = grid[1][c] = 0; // 4 block gap
    for (let c = 110; c <= 115; c++) grid[0][c] = grid[1][c] = 0; // 5 block gap
    
    // Question blocks!
    grid[4][10] = 3; // Coin
    grid[4][11] = 4; // Mushroom
    grid[4][12] = 3; // Coin
    
    // High question block
    grid[7][55] = 4; // Mushroom
    
    // Solid platform challenges using the 5.5 jump height!
    // A 5-block high wall right before a gap
    for (let r = 2; r <= 6; r++) grid[r][43] = 7; 
    
    // Floating platforms above gaps
    grid[5][81] = 1; grid[5][82] = 1; grid[5][83] = 1; 

    // Tall Pipes to jump over!
    // 4-block high pipe
    grid[2][30] = 5; grid[3][30] = 5; grid[4][30] = 5; grid[5][30] = 6;
    
    // 5-block high pipe (requires near max jump)
    grid[2][65] = 5; grid[3][65] = 5; grid[4][65] = 5; grid[5][65] = 5; grid[6][65] = 6;
    
    // A staircase up to a 5-block height to jump over the final 5-block gap
    grid[2][105] = 7;
    grid[2][106] = 7; grid[3][106] = 7;
    grid[2][107] = 7; grid[3][107] = 7; grid[4][107] = 7;
    grid[2][108] = 7; grid[3][108] = 7; grid[4][108] = 7; grid[5][108] = 7;
    grid[2][109] = 7; grid[3][109] = 7; grid[4][109] = 7; grid[5][109] = 7; grid[6][109] = 7;

    const enemies: EnemyDef[] = [
        { type: 'goomba', col: 15, row: 2 },
        { type: 'turtle', col: 35, row: 2 },
        { type: 'goomba', col: 55, row: 2 },
        { type: 'turtle', col: 75, row: 2 },
        { type: 'goomba', col: 95, row: 2 },
        { type: 'turtle', col: 125, row: 2 },
    ];

    return {
        name: 'The Towers',
        width: W,
        height: H,
        tileSize: TILE,
        tiles: grid,
        enemies,
        coins: [],
        playerStartCol: 5,
        playerStartRow: 2,
        flagCol: 160,
        flagRow: 2,
        timeLimit: 400,
    };
}

// ── Exported levels array ──────────────────────────────────────────
export const Levels: LevelConfig[] = [
    buildLevel1(),
    buildLevel2(),
    buildLevel3(),
];
