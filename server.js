import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import { Server } from 'socket.io';
import { Game } from './game.js';
import OpenAI from "openai";

const app = express();
const server = createServer(app);
const io = new Server(server);
const game = new Game();

let playerUrls = [[],[]];

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI,
});

game.listen((...args) => {
    console.log('game emit', args);
    io.emit(...args);
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname + '/'));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

const refreshPlayers = () => {
    io.emit('players', game.players);
}

const refreshPlayerUrls = () => {
    io.emit('playersUrls', playerUrls);
}

const reset = () => {
    io.emit('reset');
    playerUrls = [[],[]];
}

io.on('connection', socket => {
    console.log(`user ${socket.id} connected`);

    socket.emit('reset');
    socket.emit('players', game.players);
    socket.emit('playersUrls', playerUrls);

    socket.on('join', (playerNum, cb) => {
        const joined = game.join(socket.id, playerNum);
        cb(joined);

        if (joined) {
            refreshPlayers();
        }
    });

    socket.on('ready', ( playerNumClient, imageData, cb )=> {
        imageData = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(imageData, "base64");

        fs.writeFile(join(__dirname, `images/player${playerNumClient}.png`), buffer, null, err => {
            if (err) {
                console.error('writefile error', err);
            }

            getImageVariations(playerNumClient).then(imagesData => {
                const imageUrls = imagesData.map(imagesDatum => imagesDatum.url);
                const playerNum = game.ready(socket.id);
    
                if (playerNum !== false) {
                    cb(playerNum);
                    playerUrls[playerNum] = imageUrls;
                    refreshPlayers();
                    refreshPlayerUrls();
                } else {
                    cb(false);
                }
            }).catch(error => {
                console.log('getImageVariations error', error);
            })
        });
    });

    socket.on('tak', () => {
        const tak = game.tak(socket.id);

        if (tak) {
            refreshPlayers();
        }
    });

    socket.on('disconnect', () => {
        console.log(`user ${socket.id} disconnected`);
    });

    socket.on('reset', () => {
        game.reset();
        reset();
        refreshPlayers();
    })
});

async function getImageVariations(playerNumClient) {
    const images = await openai.images.createVariation({
        image: fs.createReadStream(`images/player${playerNumClient}.png`),
        // n: 2,
        n: 1,
        size: "512x512",
        // response_format: "b64_json", // use url
        // model: 'dall-e-2' // use default
    });

    return images.data;
}

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
});