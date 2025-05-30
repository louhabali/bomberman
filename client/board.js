import { Render, store } from "./game.js";
import mf from "./mini-framework.js";
import { Player } from "./player.js";

const MIN_CELL_SIZE = 32;
const MAX_CELL_SIZE = 64;

let devicePlayer

let keyEventCleanup = null

function calcCellSize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const availableWidth = windowWidth * 0.8;
    const availableHeight = windowHeight * 0.8;

    const cellByWidth = Math.floor(availableWidth / 15);
    const cellByHeight = Math.floor(availableHeight / 13);

    let cellSize = Math.min(cellByWidth, cellByHeight)

    cellSize = Math.max(MIN_CELL_SIZE, Math.min(cellSize, MAX_CELL_SIZE))

    return cellSize
}

let playersInit = false;


export function GameView() {
    if (!playersInit && store.getState().room) {
        initializePlayers();
        playersInit = true;
    }

    return mf.createElement("div", { class: "game-view" }, Board())
}

function Board() {
    const cellSize = calcCellSize();

    return mf.createElement("div", {
        class: "board",
        style: `grid-template-rows: repeat(13, ${cellSize}px); grid-template-columns: repeat(15, ${cellSize}px);`
    }, Cells(), players(), gameHeader())
}



function Cells() {
    const cells = []
    store.getState().room.map.forEach((row, i) => {
        row.forEach((val, j) => {
            cells.push(mf.createElement("div", {
                id: `${i}#${j}`,
                class: val == 2 ? "solid" : val == 1 ? "soft" : "empty",
            }, ""))
        })
    });
    return cells
}

function initializePlayers() {
    const cellSize = calcCellSize();
    const size = Math.trunc(cellSize)
    const initPos = [[1, 1], [11, 13], [1, 13], [11, 1]]

    store.getState().players = [];

    store.getState().room.players.forEach((player, i) => {
        const x = cellSize * initPos[i][1];
        const y = cellSize * initPos[i][0];
        const playerx = new Player(x, y, size, store.getState().room.id, player.nickname, player.avatar);

        if (player.nickname == store.getState().u_name) {
            playerx.speed = cellSize * 0.048;
            devicePlayer = playerx;
            setUpKeysEvents();
        }

        store.getState().players.push(playerx);
    });
}

function players() {
    if (!store.getState().players || store.getState().players.length === 0) {
        return [];
    }

    return store.getState().players.map(player => {
        return mf.createElement("div", {
            class: "player",
            style: `width: ${player.size}px; height: ${player.size}px; transform: translate(${player.position.x}px, ${player.position.y}px);`,
            ref: (el) => {
                if (!player.element) {
                    player.element = el;
                    player.bgResize();
                }
            }
        });
    });
}

const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]

function keyDownHandler(e) {
    if (e.key === "z") {
        devicePlayer?.createBomb()
        store.getState().ws.send(JSON.stringify({ type: "bomb", name: devicePlayer.name, room_id: store.getState().room.id }))

    }

    if (keys.includes(e.key) && !devicePlayer.moveKeys.includes(e.key)) {
        devicePlayer[e.key]()
        devicePlayer.moveKeys.unshift(e.key)
    }
}

function keyUpHandler(e) {
    const keyIdx = devicePlayer.moveKeys.indexOf(e.key)
    if (keyIdx != -1) {
        devicePlayer._sendPosition(e.key, "stop")
        devicePlayer.moveKeys.splice(keyIdx, 1)
    }
}

function setUpKeysEvents() {
    const keyDownCleanup = mf.listener("keydown", keyDownHandler)
    const keyUpCleanup = mf.listener("keyup", keyUpHandler)

    keyEventCleanup = () => {
        keyDownCleanup();
        keyUpCleanup();
    };
}


function removeKeysEvents() {
    debugger
   if (keyEventCleanup) {
        keyEventCleanup();
        keyEventCleanup = null;
    }
}



function gameHeader() {
    const player = store.getState().players.find(player => player.name == store.getState().u_name)
    return mf.createElement("span", {
        class: "game-header",
    },
        mf.createElement('span', {
            class: "character",
            ref: (el) => {
                el.style.backgroundImage = `url(./images/avatars/${player.avatar}.png)`;
            }
        }),
        mf.createElement('span', {
            class: "hearts",
            ref: (el) => {
                store.setState({ lifes: el })
            }
        }, heart(), heart(), heart())
    )
}

function heart() {
    return mf.createElement('span', {},'💚')
}

export function winScreen(name) {
    return mf.createElement('div', { class: "win-screen" },
        mf.createElement('h1', { id: 'h1' }, name ? `THE WINNER IS : ${name} 🎉` : `IT'S A DRAW 🤝`),
        mf.createElement('span', {
            class: 'replay',
            onclick: () => {
                store.setState({ players: [], u_name: "", messages: [] })
                playersInit = false
                removeKeysEvents()
                Render('login');
            }
        }, 'PLAY AGAIN')
    )
}