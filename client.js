
const socket = io();
let isPlayer = false;
let gameStarted = false;
let videoStream;
let countdownInterval;

const gid = id => document.getElementById(id);

const mainBox = gid('main');
const countdown = gid('countdown');
const defaultImage = '<img src="/images/unlocked-player.png" alt="" class="default">';

const playerBoxes = [ gid('player1'), gid('player2') ];
const playerChakras = [ gid('chakra1'), gid('chakra2') ];
const playerVideos = [ gid('video1'), gid('video2') ];
const playerCanvas = [ gid('canvas1'), gid('canvas2') ];
const playerImages = [ gid('images1'), gid('images2') ];

const constraints = {
    video: true,
    width: 300,
    height: 300,
    aspectRatio: 1
};

document.addEventListener('keyup', e => {
    e.preventDefault();

    if (isPlayer && gameStarted) {
        socket.emit('tak');
    }
});

socket.on('gameStarted', () => {
    clearInterval(countdownInterval);
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
    countdownInterval = setInterval(() => {
        countdown.innerHTML = `Starting in ${count--}`;
        if (count <= 0) {
            clearInterval(countdownInterval);
        };
    }, 1000);
});

socket.on('playersUrls', playersUrls => {
    playersUrls.forEach((playerUrls, playerNum) => {
        let htmlString = "";

        playerUrls.forEach(playerUrl => {
            htmlString += `<img src="${playerUrl}" alt="">`;
        });

        if ( !htmlString ) {
            htmlString = defaultImage;
        }
        // console.log('htmlString', htmlString);
        playerImages[playerNum].innerHTML = htmlString
    });
});

function join(playerNum) {
    socket.emit('join', playerNum, joined => {
        if (joined) {
            const playerBox = playerBoxes[playerNum];
            alert(`joined as player ${playerNum + 1}`);
            addBoxState(playerBox, 'my-box');
            addBoxState(playerBoxes[(playerNum + 1) % 2], 'not-my-box');
            isPlayer = true;

            addBoxState(playerBox, 'loading');

            navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
                videoStream = stream;
                playerVideos[playerNum].srcObject = stream;
                removeBoxState(playerBox, 'loading');
            });


        } else {
            alert('failed to join, player slot already occupied');
        }
    });
}

function ready(playerNum) {
    const canvas = playerCanvas[playerNum];
    const context = canvas.getContext('2d');
    const video = playerVideos[playerNum];
    const playerBox = playerBoxes[playerNum];

    addBoxState(playerBox, 'loading');

    clipStart = video.clientWidth / 2 - 250;
    context.drawImage(video, clipStart, 0, 600, 600, 0, 0, 300, 300);
    video.pause();
    videoStream?.getTracks().forEach(track => track.stop());

    const imageData = canvas.toDataURL();

    socket.emit('ready', playerNum, imageData, (isReady) => {
        // console.log('isReady', isReady);
        if (isReady !== false) {
            // console.log('here');
            removeBoxState(playerBox, 'loading');
            addBoxState(playerBox, 'ready');
            
            videoStream?.getTracks().forEach(track => {
                videoStream.removeTrack(track);
            });
        }
    });
}

function reset() {
    socket.emit('reset');
}

const addBoxState = (playerBox, state) => {
    playerBox.classList.add(state);
}

const removeBoxState = (playerBox, state) => {
    playerBox.classList.remove(state);
}

const clearBoxes = () => {
    playerBoxes.forEach(playerBox => {
        playerBox.className = "player"
    });

    playerChakras.forEach(playerChakra => {
        playerChakra.innerHTML = 0;
    });

    playerImages.forEach(playerImage => {
        playerImage.innerHTML = defaultImage;
    });
}