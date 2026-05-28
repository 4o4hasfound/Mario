const { ccclass, property } = cc._decorator;

/**
 * FirebaseManager - Singleton for managing Firebase Auth and Firestore Leaderboard.
 * Dynamically loads Firebase v8 CDN scripts so you don't need to struggle with npm modules in Cocos 2.4.
 */
@ccclass
export default class FirebaseManager extends cc.Component {

    private static _instance: FirebaseManager = null;

    public static get instance(): FirebaseManager {
        return FirebaseManager._instance;
    }

    // ==========================================
    // REPLACE THIS WITH YOUR FIREBASE CONFIG
    // ==========================================
    private firebaseConfig = {

        apiKey: "AIzaSyActqedBgL-2yqqLiFs30QJ-L-TkZjTrms",

        authDomain: "mario-3f46d.firebaseapp.com",

        projectId: "mario-3f46d",

        storageBucket: "mario-3f46d.firebasestorage.app",

        messagingSenderId: "644954969006",

        appId: "1:644954969006:web:e3f10c55d0481182ad2e3f"

    };


    public isInitialized: boolean = false;
    public currentUserEmail: string = null;

    onLoad() {
        if (FirebaseManager._instance && FirebaseManager._instance !== this) {
            this.node.destroy();
            return;
        }
        FirebaseManager._instance = this;
        cc.game.addPersistRootNode(this.node);

        this.initFirebase();
    }

    /**
     * Dynamically injects Firebase v8 SDK scripts if not present, then initializes.
     */
    private initFirebase() {
        if (typeof (window as any).firebase !== 'undefined') {
            this._setupFirebase();
            return;
        }

        const urls = [
            "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js",
            "https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js",
            "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"
        ];

        let loaded = 0;
        urls.forEach(url => {
            const script = document.createElement('script');
            script.src = url;
            script.async = false;
            script.onload = () => {
                loaded++;
                if (loaded === urls.length) {
                    this._setupFirebase();
                }
            };
            document.head.appendChild(script);
        });
    }

    private _setupFirebase() {
        const firebase = (window as any).firebase;
        if (!firebase.apps.length) {
            firebase.initializeApp(this.firebaseConfig);
        }
        this.isInitialized = true;
        cc.log("Firebase Initialized Successfully.");

        // Listen for auth state changes
        firebase.auth().onAuthStateChanged((user: any) => {
            if (user) {
                this.currentUserEmail = user.email;
                cc.systemEvent.emit('firebase-login', user.email);
                cc.log(`Logged in as: ${user.email}`);
            } else {
                this.currentUserEmail = null;
                cc.systemEvent.emit('firebase-logout');
            }
        });
    }

    // --- Authentication ---

    public async signUp(email: string, pass: string): Promise<string> {
        if (!this.isInitialized) return "Firebase not initialized.";
        try {
            const firebase = (window as any).firebase;
            await firebase.auth().createUserWithEmailAndPassword(email, pass);
            return "SUCCESS";
        } catch (error: any) {
            return error.message;
        }
    }

    public async login(email: string, pass: string): Promise<string> {
        if (!this.isInitialized) return "Firebase not initialized.";
        try {
            const firebase = (window as any).firebase;
            await firebase.auth().signInWithEmailAndPassword(email, pass);
            return "SUCCESS";
        } catch (error: any) {
            return error.message;
        }
    }

    public logout() {
        if (!this.isInitialized) return;
        const firebase = (window as any).firebase;
        firebase.auth().signOut();
    }

    // --- Firestore / Leaderboard ---

    /**
     * Saves or updates the user's high score in Firestore
     */
    public async saveHighScore(score: number): Promise<void> {
        if (!this.isInitialized || !this.currentUserEmail) return;
        try {
            const db = (window as any).firebase.firestore();
            const userRef = db.collection("users").doc(this.currentUserEmail);

            const doc = await userRef.get();
            if (doc.exists) {
                const currentScore = doc.data().score || 0;
                if (score > currentScore) {
                    await userRef.update({ score: score, updatedAt: new Date() });
                }
            } else {
                await userRef.set({ email: this.currentUserEmail, score: score, updatedAt: new Date() });
            }
            cc.log("High score synced to Firebase.");
        } catch (error) {
            cc.error("Error saving score: ", error);
        }
    }

    /**
     * Retrieves the current logged-in user's high score
     */
    public async fetchMyHighScore(): Promise<number> {
        if (!this.isInitialized || !this.currentUserEmail) return 0;
        try {
            const db = (window as any).firebase.firestore();
            const doc = await db.collection("users").doc(this.currentUserEmail).get();
            if (doc.exists) {
                return doc.data().score || 0;
            }
        } catch (error) {
            cc.error("Error fetching score: ", error);
        }
        return 0;
    }

    /**
     * Retrieves the top 10 players for the leaderboard
     */
    public async getLeaderboard(): Promise<Array<{ email: string, score: number }>> {
        if (!this.isInitialized) return [];
        try {
            const db = (window as any).firebase.firestore();
            const snapshot = await db.collection("users")
                .orderBy("score", "desc")
                .limit(10)
                .get();

            let leaderboard: Array<{ email: string, score: number }> = [];
            snapshot.forEach((doc: any) => {
                leaderboard.push({
                    email: doc.data().email,
                    score: doc.data().score
                });
            });
            return leaderboard;
        } catch (error) {
            cc.error("Error fetching leaderboard: ", error);
            return [];
        }
    }
}
