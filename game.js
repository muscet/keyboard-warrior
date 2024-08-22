
export class Game {
    started = false;
    players = [];
    cb = null;
    target = 400
    minTarget = 200
    winThreshold = 100
    images = [[], []]

    get hasTwoPlayers() {
        return this.players[0] && this.players[1];
    }

    get allPlayersReady() {
        return this.hasTwoPlayers && this.players.every(player => player.ready);
    }

    constructor() {
    }

    join(id, playerNum) {
        if (this.players[playerNum]) {
            return false;
        }

        const player = new Player(id, playerNum);
        this.players[playerNum] = player;
        return player;
    }

    ready(id) {
        const player = this.players.find(player => player?.id === id);

        if (player) {
            player.ready = true;

            if (this.allPlayersReady) {
                this.startCountDown()
            }

            return player.playerNum;
        }

        return false;
    }

    startCountDown() {
        this.emit('countdown');

        setTimeout(() => {
            this.startGame();
        }, 3000);
    }

    startGame() {
        this.started = true;
        this.emit('gameStarted');
    }

    tak(id) {
        const player = this.players.find(player => player?.id === id);

        if (player) {
            player.takataks += 1;
            this.winEvaluation()            
            return true;
        } 
        
        return false;
    }

    winEvaluation() {
        if ( this.hasTwoPlayers ) {
            const winner = this.players.find((player, index) => {
                const otherPlayer = this.players[(index + 1) % 2];
                
                return player.takataks > this.target || (
                    player.takataks > this.minTarget &&
                    player.takataks - otherPlayer.takataks > this.winThreshold
                )
            });

            if ( winner ) {
                this.emit('gameOver', winner.playerNum);
            }
        }
    }

    reset() {
        this.players = [];
        this.started = false;
    }

    emit(...args) {
        this.cb?.(...args);
    }

    listen(cb) {
        this.cb = cb;
    }
}

export class Player {
    id = null;
    takataks = 0;
    ready = false;
    playerNum = null;

    constructor(id, playerNum) {
        this.id = id;
        this.playerNum = playerNum;
    }
}