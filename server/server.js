import http from "http"
import fs from "fs"
import path from "path"
import { WebSocketServer } from "ws"
import { RoomsManager, Player } from "./roomsManager.js"



const server = http.createServer((req, res) => {
    let filePath = `../client${req.url}`
    if (req.url === '/') {
        filePath = '../client/index.html'
    }

    const extname = path.extname(filePath)

    let contentType = 'text/html'

    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404)
                res.end('File not found')
            } else {
                res.writeHead(500)
                res.end(`Server error ${error.code}`)
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType })
            res.end(content)
        }
    })
})

const wsServer = new WebSocketServer({ server })

wsServer.on("connection", (ws) => {
    let room
    let player
    ws.on("message", (msg) => {
        try {   
            let data;
            try {
                data = JSON.parse(msg);
            } catch (parseError) {
                console.log('Invalid JSON received:', msg.toString());
                return;
            }

            switch (data.type) {
                case "join":
                    const name = data.u_name?.trim()
                    if (!name) return
                    room = RoomsManager.getAvailbelRooms();
                    if (room.nameExist(name)) {
                        const msg = {
                            type: "name taken"
                        }
                        ws.send(JSON.stringify(msg))
                        return
                    }
                    const avatar = room.pickAvatar()
                    player = new Player(name, ws, room.id, avatar)
                    room.players.push(player)
                    room.broadcast({
                        type: "waiting room update",
                        payload: {
                            playersNames: room.players.map(p => p.nickname),
                            playerCount: room.players.length
                        }
                    })

                    if (room.players.length == 2) {
                        room.startWaitingCountdown(5, true);
                        setTimeout(() => {
                            room.startWaitingCountdown(5, false);
                        }, 20000)
                    }

                    if (room.players.length == 4) {
                        room.startWaitingCountdown(2, false);
                    }


                    break;
                case 'chatMessage':
                    if (room && player && typeof data.text === 'string') {
                        room.sendChatMessage(player.nickname, data.text.trim());
                    }
                    break;
                case "movement":
                    RoomsManager.broadcastMsg(data);
                    break;
                case "bomb":
                    RoomsManager.broadcastMsg(data)
                    break;
                default:
                console.log('Unknown message type:', data.type); 
            }
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    })

    ws.on("close", () => {
        const idx = room.players.indexOf(player)
        room.players.splice(idx, 1)
        room.avatars[player.avatar] = false
        if (room.status != "playing") {
            room.broadcast({
                type: "waiting room update",
                payload: {
                    playersNames: room.players.map(p => p.nickname),
                    playerCount: room.players.length
                }
            })
        } else {
            room.broadcast({
                type: "player remove",
                payload: {
                    name: player.nickname
                }
            })
        }
    })
    ws.on("error", (err) => console.log(err));

})



server.listen(process.env.PORT || 3000, "", () => {
    console.log("server started at http://localhost:3000");
})