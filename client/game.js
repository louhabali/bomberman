import mf from "./mini-framework.js"

let unsubscribe
const app = document.getElementById("app")
export const store = mf.createStore({ /*view: "login",*/ messages: [], players: [], ws: null, speed: {v:0}, heart: {v: null} })
export let id

export async function Render(view) {
    let component = null
    // console.log(store.getState().view)
    
    switch (view) {
        case "login":
            const { homePage } = await import("./home.js");
            component = homePage;
            break;
        case "waiting":
            const { WaitingRoom } = await import("./waitingRoom.js");
            component = WaitingRoom;            
            break;
        case "game":
            const { GameView } = await import("./board.js");
            component = GameView;
            id=requestAnimationFrame(gameloop)
            break
        case "game over":
            const { winScreen } = await import("./board.js");
            component = winScreen;
            break;

    }

    if (unsubscribe) unsubscribe();
    if (view == "game over") {        
        mf.render(component(store.getState().players?.length > 0 && store.getState().players[0].name), app);
    }else{
        mf.render(component(), app);
    }
    unsubscribe = store.subscribe(() => {
        mf.render(component(), app)
    })
}

Render("login")

function gameloop(time) {
    
    store.getState().players.forEach(player => {
        if (player.moveKeys.length && player.alive) {
            if (player.name == store.getState().u_name) {
                player[player.moveKeys[0]]();
                player._sendPosition(player.moveKeys[0], "move");
            }
            player.renderMovement();
            player.moveAnimate(time, player.moveKeys[0]);
        }

        if (!player.alive || player.revive) {
            player.deathAnimation(time)
        }

        player.bombs.forEach(bomb => {
            bomb.animate(time);
        })

        player.explotionBombs.forEach(bomb => {
            bomb.handleExplotionAnimation(time);
        })

    });

    id = requestAnimationFrame(gameloop)
}
