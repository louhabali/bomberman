const PowerUps = ["speed", "range", "amount"]

class Room {
    constructor(id) {
        this.id = id
        this.players = []
        this.messages = []
        this.powerUps = {}
        this.map = this.generateMap(this.powerUps)
        this.status = 'open'
        this.countdown = null
        this.countdownInterval = null
        this.avatars = {
            death_scythe: false,
            jedi: false,
            jedi2: false,
            killer: false,
            sadako: false,
            sith: false
        }
    }

    nameExist(u_name) {
        return this.players.some(player => player.nickname == u_name)
    }

    pickAvatar() {
        while (1) {
            const i = Math.trunc(Math.random() * 6);
            const av = Object.keys(this.avatars)[i];
            if (!this.avatars[av]) {
                this.avatars[av] = true;
                return av;
            }
        }
    }

    generateMap(powerUps) {
        const map = []
        const width = 15, height = 13
        const empty = 0, soft = 1, solid = 2

        for (let i = 0; i < height; i++) {
            map[i] = []
            for (let j = 0; j < width; j++) {
                if (i === 0 || i === height - 1 || j === 0 || j === width - 1) {
                    map[i][j] = solid
                } else if (i % 2 === 0 && j % 2 === 0) {
                    map[i][j] = solid
                } else if ((i <= 2 && j <= 2) ||  // Top-left
                    (i <= 2 && j >= width - 3) ||  // Top-right
                    (i >= height - 3 && j <= 2) ||  // Bottom-left
                    (i >= height - 3 && j >= width - 3)  // Bottom-right
                ) {
                    map[i][j] = empty
                } else {
                    const type = Math.random() < 0.6 ? empty : soft;
                    map[i][j] = type;
                    let classN = "";
                    if (type == soft) {
                        if (Math.random() >= .5) classN = PowerUps[Math.trunc(Math.random() * 4)]
                    }

                    if (classN) powerUps[`_${i}_${j}`] = classN
                }
            }
        }

        return map
    }

    startWaitingCountdown(c, v) {
        clearInterval(this.countdownInterval)
        
        this.countdown = c;

        this.broadcast({
            type: 'countdown',
            countdown: this.countdown,
            isWaiting: v
        });

        this.countdownInterval = setInterval(() => {
            this.countdown--;
            if (!v) {
                this.status = 'countdown';
            }

            if (this.countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.startGame();
            } else {
                this.broadcast({
                    type: 'countdown',
                    countdown: this.countdown,
                    isWaiting: v
                });
            }
        }, 1000);
    }

    startGame() {
        this.status = 'playing';
        this.broadcast({ type: 'start game', game: this });
    }

    broadcast(msg) {
        for (const player of this.players) {
            player.ws.send(JSON.stringify(msg));
        }
    }

    sendChatMessage(nickname, text) {
        const message = {
            nickname,
            text: text,
            time: Date.now()
        };

        this.messages.push(message);

        this.broadcast({
            type: 'chatMessage',
            message: message,
        });
    }

}

export const RoomsManager = {
    rooms: [],
    getAvailbelRooms() {
        for (const room of this.rooms) {
            if (room.status === 'open' && room.players.length < 4) {
                return room;
            }
        }
        return this.createRoom()
    },

    createRoom() {
        const id = generateRoomId();
        const room = new Room(id)
        this.rooms.push(room)
        return room
    },

    destroyRoom(id) {
        for (const room of this.rooms) {
            if (room.id === id) {
                this.rooms.splice(index, 1);
            }
        }
    },

    broadcastMsg(msg) {
        const msgx = JSON.stringify(msg)
        this.rooms.forEach(room => {
            if (room.id === msg.room_id) {
                room.players.forEach(player => {
                    if (player.nickname !== msg.name) {
                        player.ws.send(msgx)
                    }
                })
            }
        })
    }
}


function generateRoomId() {
    const random = Math.random().toString(36).substr(2, 3);
    const time = Date.now().toString(36).slice(-2);
    return random + time;
}

export class Player {
    constructor(u_name, ws, roomId, avatar) {
        this.roomId = roomId
        this.nickname = u_name
        this.ws = ws
        this.avatar = avatar
    }
}
