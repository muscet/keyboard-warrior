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

// TODO: Move this to a .env file, but dont care its free
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

const reset = () => {
    io.emit('reset');
}

io.on('connection', socket => {
    console.log(`user ${socket.id} connected`);

    socket.emit('reset');
    socket.emit('players', game.players);

    socket.on('join', (playerNum, cb) => {
        const joined = game.join(socket.id, playerNum);
        cb(joined);

        if (joined) {
            refreshPlayers();
        }
    });

    socket.on('ready', (imageData, cb) => {

        // TODO: inpaint image
        // imageData = imageData.replace(/^data:image\/\w+;base64,/, "");
        // const buffer = Buffer.from(imageData, "base64");

        // fs.writeFile(join(__dirname, 'images/player.png'), buffer, null, err => {
        //     if (err) {
        //         console.error('writefile error', err);
        //     }

        //     getSuperImages().then(imagesData => {
        //         // console.log('imagesData', imagesData);

        //         imagesData.forEach((imageData, index) => {
        //             const superBuffer = Buffer.from(imageData.b64_json, "base64");

        //             fs.writeFile(join(__dirname, `images/super${index}.png`), superBuffer, null, err => {
        //                 if (err) {
        //                     console.error('super writefile error', err);
        //                 }

        //                 console.log('super image saved');
        //             });
        //         });
        //     }).catch(error => {
        //         console.log('getSuperImages error', error);
        //     })
        // });

        const playerNum = game.ready(socket.id);

        if (playerNum !== false) {
            cb(playerNum);
            refreshPlayers();
        }
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

async function getSuperImages() {
    const images = await openai.images.edit({
        image: fs.createReadStream('images/player.png'),
        mask: fs.createReadStream('images/mask.png'),
        prompt: "Anime style. Make the person super. Dont change the background",
        n: 2,
        size: "512x512",
        response_format: "b64_json",
        model: 'dall-e-2'
    });

    return images.data;
}

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
});