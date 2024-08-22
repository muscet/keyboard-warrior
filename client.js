
const socket = io();
let isPlayer = false;
let gameStarted = false;
let videoStream;

const mainBox = document.getElementById('main');
const countdown = document.getElementById('countdown');

const playerBoxes = [
    document.getElementById('player1'),
    document.getElementById('player2'),
]

const playerChakras = [
    document.getElementById('chakra1'),
    document.getElementById('chakra2'),
]

const playerVideos = [
    document.getElementById('video1'),
    // document.getElementById('video2'),
]

const playerCanvas = [
    document.getElementById('canvas1'),
    // document.getElementById('canvas2'),
]

const constraints = {
    video: true,
};

document.addEventListener('keyup', e => {
    e.preventDefault();

    if (isPlayer && gameStarted) {
        socket.emit('tak');
    }
});

socket.on('gameStarted', () => {
    gameStarted = true;
    countdown.innerHTML = "Start!";
    addBoxState(mainBox, 'started');
});

socket.on('gameOver', playerNum => {
    gameStarted = false;
    // console.log('gamestarted', gameStarted);
    countdown.innerHTML = `Player ${playerNum + 1} wins!`;
});

socket.on('reset', () => {
    isPlayer = gameStarted = false;
    clearBoxes();
    countdown.innerHTML = '';
    mainBox.className = '';
});

socket.on('players', players => {
    // console.log("client players", players)

    players.forEach(player => {
        if (player) {
            const playerBox = playerBoxes[player.playerNum];
            addBoxState(playerBox, 'occupied');

            if (player.ready) {
                addBoxState(playerBox, 'ready');
            }
        }

        if (gameStarted) {
            const playerChakra = playerChakras[player.playerNum];
            playerChakra.innerHTML = player.takataks;
        }
    })
});

socket.on('countdown', () => {
    addBoxState(mainBox, 'countdown');

    let count = 3;
    const interval = setInterval(() => {
        countdown.innerHTML = `Starting in ${count--}`;
        if (count <= 0) {
            clearInterval(interval);
        };
    }, 1000);
});

function join(playerNum) {
    socket.emit('join', playerNum, joined => {
        if (joined) {
            alert(`joined as player ${playerNum + 1}`);
            addBoxState(playerBoxes[playerNum], 'my-box');
            addBoxState(playerBoxes[(playerNum + 1) % 2], 'not-my-box');
            isPlayer = true;

            // navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            //     videoStream = stream;
            //     playerVideos[playerNum].srcObject = stream;
            // });


        } else {
            alert('failed to join, player slot already occupied');
        }
    });
}

function ready(playerNum) {
    // const canvas = playerCanvas[playerNum];
    // const context = canvas.getContext('2d');
    // const video = playerVideos[playerNum];

    // context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // video.pause();
    // videoStream?.getTracks().forEach(track => track.stop());

    // const imageData = canvas.toDataURL();

    const imageData = null

    socket.emit('ready', imageData, isReady => {
        if (isReady) {
            addBoxState(playerBoxes[playerNum], 'ready');
        }
    });
}

function reset() {
    socket.emit('reset');
}

const addBoxState = (playerBox, state) => {
    playerBox.classList.add(state);
}

const clearBoxes = () => {
    playerBoxes.forEach(playerBox => {
        playerBox.className = "player"
    });

    playerChakras.forEach(playerChakra => {
        playerChakra.innerHTML = 0;
    });
}