import mf from "./mini-framework.js"
import { store } from "./game.js"



export function chatMessage() {

    const { messages, ws } = store.getState();

    function sendMessage() {

        const input = document.getElementById('inputId');
        const message = input.value.trim();

        if (message.trim() === "") return;

        ws.send(JSON.stringify({
            type: "chatMessage",
            text: message
        }));
        input.value = '';

    }

    return mf.createElement("div", { class: "chat-container" },
        mf.createElement("h3", {class: "chat-header"}, "Chat"),
        mf.createElement("div", { class: "chat-messages" },
            messages.map(m =>
                mf.createElement("div", { class: "chat-message" },
                    mf.createElement('span', { class: 'sender' }, `${m.nickname}:`),
                    mf.createElement("span", {}, m.text)
                )
            )
        ),

        mf.createElement("div", { class: "chat-input" },
            mf.createElement("input", {
                type: "text",
                id: "inputId",
                placeholder: "Type a message...",
            }),
            mf.createElement("button", { onclick: sendMessage }, "Send")
        )
    )

}


export function WaitingRoom() {
    const { playerCount, playersNames, countdown, isWaiting } = store.getState();
    
    return mf.createElement("div", { class: "home-view" },
        mf.createElement("div", { class: "waiting-container" },
            mf.createElement("h2", {}, "Waiting for players..."),
            mf.createElement("p", {}, `Players connected: ${playerCount}/4`),
            mf.createElement("ul", { id: "players-list" },
                playersNames.map(name =>
                    mf.createElement("li", {}, name)
                )
            ),
            playerCount < 2 ? mf.createElement("p", { class: "waiting-info" }, `Waiting for more players to join...`) :
            isWaiting ? mf.createElement("p", { class: "waiting-info" }, `Waiting for more players: Game starting in ${countdown?countdown:''} seconds`) :
            mf.createElement("p", { class: "waiting-info" }, `Get ready to play! Game starting in: ${countdown?countdown:''} seconds`),
        ),chatMessage());
}
