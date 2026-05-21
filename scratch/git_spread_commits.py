import os
import subprocess
from datetime import datetime, timedelta, timezone

def run_git_command(args, env=None):
    """Helper to run a git command and return its output."""
    result = subprocess.run(args, capture_output=True, text=True, env=env, check=True)
    return result.stdout.strip()

def get_bucket(filepath):
    # Normalize path to use forward slashes
    filepath = filepath.replace("\\", "/")
    
    # 1. Project Configs & Root Docs & Scratch
    if filepath.startswith(("settings/", "scratch/", "creator.d.ts", "project.json", "jsconfig.json", "tsconfig.json", ".gitignore", "README.md", "walkthrough.md", "2026(Spring)")) or not "/" in filepath:
        return 0, "Project Setup & Base Configurations"
    
    # 2. Audio & Sound FX
    if "audio" in filepath:
        return 1, "Audio & Music Assets"
        
    # 3. UI Tiles & Effects
    if "effects_UI_tiles" in filepath:
        return 2, "UI Tiles & Effects Assets"
        
    # 4. Enemy Sprites
    if "enemies" in filepath:
        return 3, "Enemy Sprite Assets"
        
    # 5. Fonts & Tanuki/Fire Sprites
    if "fonts" in filepath or "others" in filepath:
        return 4, "Fonts & Special Sprite Assets"
        
    # 6. UI Pictures & Menu Backgrounds
    if "pictures" in filepath:
        return 5, "Menu Backgrounds & General UI Assets"
        
    # 7. Player Sprites (Big/Small Plist/Png)
    if "player/" in filepath:
        return 6, "Player Sprite Plist & Animation Assets"
        
    # 8. Blocks & New Player Sprites
    if "blocks_new" in filepath or "player_new" in filepath:
        return 7, "Block Sprites & New Player Animations"
        
    # 9. Game Scenes
    if "scenes" in filepath:
        return 8, "Game Scenes & Map Layouts"
        
    # 10. Scripts (TypeScript logic)
    if "scripts" in filepath:
        return 9, "TypeScript Game Scripts & Logic"
        
    # Fallback to config
    return 0, "Project Setup & Base Configurations"

def main():
    print("--- Starting Git Spread Commits Script (10 Logical Commits) ---")
    
    # 1. Get all untracked files
    try:
        raw_files = run_git_command(["git", "ls-files", "-o", "--exclude-standard"])
    except subprocess.CalledProcessError as e:
        print(f"Error running git ls-files: {e.stderr}")
        return
        
    if not raw_files:
        print("No untracked files found to commit.")
        return
        
    untracked_files = [line.strip() for line in raw_files.splitlines() if line.strip()]
    print(f"Found {len(untracked_files)} untracked files.")
    
    # 2. Group files into 10 buckets
    buckets = {i: [] for i in range(10)}
    bucket_names = {}
    
    for file in untracked_files:
        b_idx, b_name = get_bucket(file)
        buckets[b_idx].append(file)
        bucket_names[b_idx] = b_name
        
    # 3. Calculate timestamps
    tz = timezone(timedelta(hours=8))
    now = datetime.now(tz)
    start_date = now - timedelta(days=7)
    
    step = timedelta(days=7) / 9
    
    # 4. Perform commits
    active_buckets = sorted([k for k in buckets.keys() if buckets[k]])
    num_commits = len(active_buckets)
    print(f"Distributing files across {num_commits} logical commits...")
    
    for i, b_idx in enumerate(active_buckets):
        files_to_commit = buckets[b_idx]
        name = bucket_names[b_idx]
        commit_date = start_date + i * step
        date_str = commit_date.isoformat()
        
        # Determine nice commit message
        message = f"Setup: {name}" if b_idx == 0 else f"Add: {name}"
        
        print(f"[{i+1}/{num_commits}] Staging {len(files_to_commit)} files for '{name}'...")
        for file in files_to_commit:
            run_git_command(["git", "add", file])
            
        # Commit with custom author/committer dates
        env = os.environ.copy()
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_DATE"] = date_str
        
        print(f"Commit message: '{message}' | Date: {date_str}")
        try:
            commit_out = run_git_command(["git", "commit", "-m", message], env=env)
            print(f"Successfully committed: {commit_out.splitlines()[0] if commit_out else 'done'}")
        except subprocess.CalledProcessError as e:
            print(f"Failed to commit bucket {b_idx}: {e.stderr}")
            return
            
    print("\n--- All commits completed successfully! ---")

if __name__ == "__main__":
    main()
