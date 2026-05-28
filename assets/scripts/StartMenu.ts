import GameManager from './GameManager';
import AudioManager from './AudioManager';
import FirebaseManager from './FirebaseManager';

const { ccclass, property } = cc._decorator;

@ccclass
export default class StartMenu extends cc.Component {

    @property({ type: cc.Node, tooltip: 'Title image node' })
    titleNode: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'Start button node' })
    startButton: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'High score label node' })
    highScoreNode: cc.Node = null;

    @property({ type: cc.AudioClip, tooltip: 'Menu BGM clip' })
    menuBGM: cc.AudioClip = null;

    onLoad() {
        if (!GameManager.instance) {
            const gmNode = new cc.Node('GameManager');
            gmNode.addComponent(GameManager);
            cc.director.getScene().addChild(gmNode);
        }
        if (!AudioManager.instance) {
            const amNode = new cc.Node('AudioManager');
            amNode.addComponent(AudioManager);
            cc.director.getScene().addChild(amNode);
        }
        if (!FirebaseManager.instance) {
            const fmNode = new cc.Node('FirebaseManager');
            fmNode.addComponent(FirebaseManager);
            cc.director.getScene().addChild(fmNode);
        }

        this.createHTMLAuthUI();

        cc.systemEvent.on('firebase-login', this.onFirebaseLogin, this);
        cc.systemEvent.on('firebase-logout', this.onFirebaseLogout, this);
    }

    onDestroy() {
        cc.systemEvent.off('firebase-login', this.onFirebaseLogin, this);
        cc.systemEvent.off('firebase-logout', this.onFirebaseLogout, this);
        this.hideHTMLAuthUI();
    }

    start() {
        if (AudioManager.instance && this.menuBGM) {
            AudioManager.instance.playBGM(this.menuBGM);
        }
        if (this.titleNode) {
            cc.tween(this.titleNode)
                .repeatForever(
                    cc.tween()
                        .by(0.8, { y: 15 }, { easing: 'sineInOut' })
                        .by(0.8, { y: -15 }, { easing: 'sineInOut' })
                ).start();
        }
        if (this.startButton) {
            cc.tween(this.startButton)
                .repeatForever(
                    cc.tween()
                        .to(0.6, { scale: 1.05 }, { easing: 'sineInOut' })
                        .to(0.6, { scale: 1.0 }, { easing: 'sineInOut' })
                ).start();
        }
        this.updateHighScoreUI();
    }

    private updateHighScoreUI() {
        if (this.highScoreNode && GameManager.instance) {
            const label = this.highScoreNode.getComponent(cc.Label);
            if (label) {
                label.string = `HIGH SCORE: ${String(GameManager.instance.highScore).padStart(6, '0')}`;
            }
        }
    }

    public onStartClicked() {
        this.hideHTMLAuthUI();
        cc.director.loadScene('LevelSelect');
    }

    // --- HTML Overlay for Firebase Auth & Leaderboard ---

    private createHTMLAuthUI() {
        if (!cc.sys.isBrowser) return; // Only run in browser
        let ui = document.getElementById('mario-auth-ui');
        if (!ui) {
            ui = document.createElement('div');
            ui.id = 'mario-auth-ui';
            ui.style.position = 'absolute';
            ui.style.top = '10px';
            ui.style.right = '10px';
            ui.style.zIndex = '9999';
            ui.style.background = 'rgba(0,0,0,0.8)';
            ui.style.padding = '15px';
            ui.style.color = 'white';
            ui.style.fontFamily = 'Arial, sans-serif';
            ui.style.borderRadius = '8px';
            ui.innerHTML = `
                <div id="auth-logged-out">
                    <h3 style="margin-top:0; color:#FFCB05;">Mario Login</h3>
                    <input type="text" id="auth-email" placeholder="Email" style="display:block; margin-bottom:5px; padding:5px; width:100%; box-sizing:border-box;"><br/>
                    <input type="password" id="auth-pass" placeholder="Password" style="display:block; margin-bottom:5px; padding:5px; width:100%; box-sizing:border-box;"><br/>
                    <button id="btn-login" style="padding:5px 10px; cursor:pointer;">Login</button>
                    <button id="btn-signup" style="padding:5px 10px; cursor:pointer;">Sign Up</button>
                    <div id="auth-status" style="margin-top:5px; font-size:12px; color:yellow;"></div>
                </div>
                <div id="auth-logged-in" style="display:none;">
                    <div id="auth-user" style="margin-bottom:10px; color:#4CAF50; font-weight:bold;"></div>
                    <button id="btn-leaderboard" style="padding:5px 10px; cursor:pointer; background:#2196F3; color:white; border:none; border-radius:3px;">Leaderboard</button>
                    <button id="btn-logout" style="padding:5px 10px; cursor:pointer; background:#f44336; color:white; border:none; border-radius:3px;">Logout</button>
                </div>
            `;
            document.body.appendChild(ui);

            // Leaderboard Modal
            const lbDiv = document.createElement('div');
            lbDiv.id = 'mario-lb-ui';
            lbDiv.style.position = 'absolute';
            lbDiv.style.top = '50%';
            lbDiv.style.left = '50%';
            lbDiv.style.transform = 'translate(-50%, -50%)';
            lbDiv.style.zIndex = '10000';
            lbDiv.style.background = 'rgba(0,0,0,0.95)';
            lbDiv.style.padding = '20px';
            lbDiv.style.color = 'white';
            lbDiv.style.fontFamily = 'Arial, sans-serif';
            lbDiv.style.borderRadius = '10px';
            lbDiv.style.display = 'none';
            lbDiv.style.minWidth = '300px';
            lbDiv.style.boxShadow = '0px 0px 20px rgba(255,215,0,0.5)';
            lbDiv.innerHTML = `
                <h2 style="text-align:center; margin-top:0; color:#FFCB05;">Global Leaderboard</h2>
                <div id="lb-content" style="margin-bottom:15px; font-size:18px; line-height:1.5;">Loading...</div>
                <button id="btn-close-lb" style="display:block; width:100%; padding:10px; cursor:pointer; background:#555; color:white; border:none; border-radius:5px;">Close</button>
            `;
            document.body.appendChild(lbDiv);

            this.bindAuthEvents();
        }
        ui.style.display = 'block';

        // Check initial state
        if (FirebaseManager.instance && FirebaseManager.instance.currentUserEmail) {
            this.onFirebaseLogin(FirebaseManager.instance.currentUserEmail);
        }
    }

    private hideHTMLAuthUI() {
        if (!cc.sys.isBrowser) return;
        const ui = document.getElementById('mario-auth-ui');
        if (ui) ui.style.display = 'none';
        const lb = document.getElementById('mario-lb-ui');
        if (lb) lb.style.display = 'none';
    }

    private bindAuthEvents() {
        document.getElementById('btn-login').onclick = async () => {
            const email = (document.getElementById('auth-email') as HTMLInputElement).value;
            const pass = (document.getElementById('auth-pass') as HTMLInputElement).value;
            document.getElementById('auth-status').innerText = "Logging in...";
            const res = await FirebaseManager.instance.login(email, pass);
            if (res !== "SUCCESS") document.getElementById('auth-status').innerText = res;
        };

        document.getElementById('btn-signup').onclick = async () => {
            const email = (document.getElementById('auth-email') as HTMLInputElement).value;
            const pass = (document.getElementById('auth-pass') as HTMLInputElement).value;
            document.getElementById('auth-status').innerText = "Signing up...";
            const res = await FirebaseManager.instance.signUp(email, pass);
            if (res !== "SUCCESS") document.getElementById('auth-status').innerText = res;
        };

        document.getElementById('btn-logout').onclick = () => {
            FirebaseManager.instance.logout();
        };

        document.getElementById('btn-leaderboard').onclick = async () => {
            const lb = document.getElementById('mario-lb-ui');
            lb.style.display = 'block';
            document.getElementById('lb-content').innerHTML = "Fetching scores...";
            const scores = await FirebaseManager.instance.getLeaderboard();
            let html = "<ol style='padding-left:20px;'>";
            scores.forEach(s => {
                html += `<li>${s.email.split('@')[0]}: <span style="color:#FFCB05; float:right;">${s.score}</span></li>`;
            });
            html += "</ol>";
            if (scores.length === 0) html = "No scores found.";
            document.getElementById('lb-content').innerHTML = html;
        };

        document.getElementById('btn-close-lb').onclick = () => {
            document.getElementById('mario-lb-ui').style.display = 'none';
        };
    }

    private onFirebaseLogin(email: string) {
        if (!cc.sys.isBrowser) return;
        document.getElementById('auth-logged-out').style.display = 'none';
        document.getElementById('auth-logged-in').style.display = 'block';
        document.getElementById('auth-user').innerText = `Welcome, ${email}`;
        
        // Refresh local UI after small delay to let Firebase sync
        this.scheduleOnce(() => {
            this.updateHighScoreUI();
        }, 1.0);
    }

    private onFirebaseLogout() {
        if (!cc.sys.isBrowser) return;
        document.getElementById('auth-logged-out').style.display = 'block';
        document.getElementById('auth-logged-in').style.display = 'none';
        document.getElementById('auth-status').innerText = "";
    }
}
