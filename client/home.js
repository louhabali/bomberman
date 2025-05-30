import mf from "./mini-framework.js"
import { id, Render, store } from "./game.js";

function handleNameSub() {
    const name = store.getState().u_name
    let ws = store.getState().ws

    if (!ws) {
        ws = new WebSocket("ws://http://localhost:3000")
        store.setState({ ws })

        ws.onopen = () => {
            const msg = {
                type: "join",
                u_name: name
            }
            ws.send(JSON.stringify(msg))
        }

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            switch (data.type) {
                case "name taken":
                    store.setState({ loginError: "this name is taken, choose another one!!!" }); break;
                case "waiting room update":

                        store.setState({
                            playersNames: data.payload.playersNames,
                            playerCount: data.payload.playerCount,
                        });
                        Render("waiting");
                    break;
                case 'countdown':
                    store.setState({ countdown: data.countdown, isWaiting: data.isWaiting });
                    break;
                case 'start game':
                    store.setState({ room: data.game });
                    Render('game');
                    break;
                case 'chatMessage':
                    const newMessage = {
                        id: Date.now().toString(),
                        text: data.message.text,
                        nickname: data.message.nickname,
                        time: new Date(data.message.time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    };
                    store.setState({ messages: [...store.getState().messages, newMessage] })
                    // Render();
                    break;
                case "movement":
                    store.getState().players.forEach(player => {
                        if (player.name === data.name) {
                            if (data.event == "move") {
                                player.position.x = data.amount[0] * (player.size);
                                player.position.y = data.amount[1] * (player.size);
                                if (!player.moveKeys.includes(data.dir)) {
                                    player.moveKeys.unshift(data.dir)
                                }
                            } else {
                                const keyIdx = player.moveKeys.indexOf(data.dir)
                                if (keyIdx != -1) {
                                    player.moveKeys.splice(keyIdx, 1)
                                }
                            }
                        }
                    });
                    break;
                case "bomb":
                    store.getState().players.forEach(player => {
                        if (player.name === data.name) {
                            player.createBomb()
                        }
                    })
                    break;
                case "player remove": {
                    let player;
                    const ps = store.getState().players.forEach(p => {
                        if (p.name == data.payload.name) {
                            player = p
                        }
                    });

                    const idx = store.getState().players.indexOf(player);
                    if (idx != -1) {
                        store.getState().players.splice(idx, 1)
                    }

                    player.element.remove();
                    console.log( store.getState().players);
                    if (store.getState().players.length == 1 || store.getState().players.length == 0) {
                      cancelAnimationFrame(id)
                      Render("game over")
                    }
                    
                }
            }
        }

        return
    }

    const msg = {
        type: "join",
        u_name: name
    }
    ws.send(JSON.stringify(msg))
}



const bombLogo = () => {
    return mf.createElement("div", { class: "logo-container" },
        mf.createElement('div', { class: "glow-bg" }),
        mf.createElement('div', { class: "logo" })
    )
}

const header = () => {
    return mf.createElement("h1", { class: "bomberman-header" }, "BOMBERMAN")
}

const loginEL = () => {
    return mf.createElement("div", { class: "login-container" },
        mf.createElement("input", {
            class: "u_name", type: "text", placeHolder: "Enter a nickname... ",
            value: store.getState().u_name || '', onInput: (e) => store.setState({ u_name: e.target.value })
        }),
        mf.createElement("div", { style: "color: red;text-align: center" }, store.getState().loginError),
        mf.createElement("div", { class: "sub-bt", onClick: handleNameSub }, "START")
    )

}

export function homePage() {
    return mf.createElement("div", { class: "home-view" }, bombLogo(), header(), loginEL())
} 