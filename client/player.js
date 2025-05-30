import { store } from "./game.js"
import { Bomb } from "./bomb.js"
export class Player {
    constructor(x, y, size, roomId, name, avatar) {
        this.element = null
        this.lifes = 3
        this.revive = false
        this.alive = true
        this.initPos = {
            x: x,
            y: y
        }
        this.position = {
            x: x,
            y: y
        }
        this.size = size
        this.roomId = roomId
        this.name = name
        this.moveKeys = []
        this.avatar = avatar
        this.sprite = {
            framesize: this.size,
            currentFrame: 0,
            frameCount: 4,
            lastUpdate: 0,
            animationSpeed: 80,
            direction: {
                ArrowDown: 0,
                ArrowLeft: avatar == "sadako" ? size * 2 : size,
                ArrowRight: avatar == "sadako" ? size : size * 2,
                ArrowUp: size * 3
            }

        }
        this.deathSprite = {
            lastUpdate: 0,
            animationSpeed: 80,
        }

        this.bombsCount = 1
        this.bombs = [];
        this.explotionBombs = []
        this.bombRange = 1
        this.speed = 0 
    }

    deathAnimation(currentTime) {
        if (currentTime - this.deathSprite.lastUpdate > this.deathSprite.animationSpeed) {
            this.deathSprite.lastUpdate = currentTime;
            this.element.classList.toggle('opacity0');
        }
    }

    createBomb() {
        if (this.bombs.length < this.bombsCount && this.alive) {
            const i = Math.trunc((this.position.y + (this.size * 0.5)) / this.size)
            const j = Math.trunc((this.position.x + (this.size * 0.5)) / this.size)
            const b = new Bomb(i, j, this.size, this)
            this.bombs.push(b)
            store.getState().room.map[i][j] = 5
            setTimeout(() => {
                b?.explod()
            }, 3000)
        }
    }

    bgResize() {
        this.element.style.backgroundSize = `${this.size * 4}px ${this.size * 4}px`;
        this.element.style.backgroundImage = `url(./images/avatars/${this.avatar}.png)`
    }

    ArrowRight() {
        const newR = Math.trunc((this.position.y + (0.5 * this.size)) / this.size) * this.size
        if ((Math.abs(newR - this.position.y)) > this.speed) {
            this.position.y += newR > this.position.y ? this.speed : -this.speed;
            return
        }
        this.position.y = newR
        if (this.canMove("h", 1, 1)) {
            this.position.x += this.speed
        }
    }

    ArrowLeft() {
        const newR = Math.trunc((this.position.y + (0.5 * this.size)) / this.size) * this.size
        if ((Math.abs(newR - this.position.y)) > this.speed) {
            this.position.y += newR > this.position.y ? this.speed : -this.speed;
            return
        }
        this.position.y = newR
        if (this.canMove("h", 0, -1)) {
            this.position.x -= this.speed;
        }
    }

    ArrowUp() {
        const newC = Math.trunc((this.position.x + (0.5 * this.size)) / this.size) * this.size
        if ((Math.abs(newC - this.position.x)) > this.speed) {
            this.position.x += newC > this.position.x ? this.speed : -this.speed;
            return
        }
        this.position.x = newC
        if (this.canMove("v", 0, -1)) {
            this.position.y -= this.speed;
        }
    }

    ArrowDown() {
        const newC = Math.trunc((this.position.x + (0.5 * this.size)) / this.size) * this.size
        if ((Math.abs(newC - this.position.x)) > this.speed) {
            this.position.x += newC > this.position.x ? this.speed : -this.speed;
        }
        this.position.x = newC
        if (this.canMove("v", 1, 1)) {
            this.position.y += this.speed;
        }
    }

    canMove(dir, v, x) {
        if (dir == "h") {
            return store.getState().room.map[Math.trunc(((this.position.y + (this.size * 0.5)) / this.size))][Math.trunc(((this.position.x + (this.size * v) + (this.speed * x)) / this.size))] == 0
        } else {
            return store.getState().room.map[Math.trunc(((this.position.y + (this.size * v) + (this.speed * x)) / this.size))][Math.trunc(((this.position.x + (this.size * 0.5)) / this.size))] == 0
        }
    }

    renderMovement() {
        this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
        const i = Math.trunc(((this.position.y + (this.size * 0.5)) / this.size))
        const j = Math.trunc(((this.position.x + (this.size * 0.5)) / this.size))
        const powerType = store.getState().room.powerUps[`_${i}_${j}`]
        if (powerType) {
            document.getElementById(`${i}#${j}`).classList.remove(powerType)
            switch (powerType) {
                case "speed":
                    if (this.name == store.getState().u_name) this.speed *= 1.1;
                    break;
                case "range":
                    this.bombRange++
                    // console.log("ddd",this.bombRange);
                    break;
                case "amount":
                    this.bombsCount++
                    break;
            }
            store.getState().room.powerUps[`_${i}_${j}`] = "";
        }
    }

    moveAnimate(currentTime, dir) {
        if (currentTime - this.sprite.lastUpdate > this.sprite.animationSpeed) {
            this.sprite.currentFrame = (this.sprite.currentFrame + 1) % this.sprite.frameCount;
            this.sprite.lastUpdate = currentTime;

            const x = this.sprite.currentFrame * this.sprite.framesize;
            const y = this.sprite.direction[dir];
            this.element.style.backgroundPosition = `-${x}px -${y}px`;
        }
    }

    _sendPosition(dir, event) {
        const msg = {
            type: "movement",
            event,
            dir,
            amount: [this.position.x / (this.size), this.position.y / (this.size)],
            room_id: this.roomId,
            name: this.name
        }
        store.getState().ws.send(JSON.stringify(msg))
    }

    death() {
        this.lifes -= 1;
        if (this.name == store.getState().u_name) {
            store.getState().lifes.removeChild(store.getState().lifes.lastChild);
        }
        this.alive = false
        this.position.x = this.initPos.x;
        this.position.y = this.initPos.y;
        this.element.style.backgroundPosition = `0px 0px`;
        this.element.classList.remove('opacity1')
        setTimeout(() => {
            if(this.lifes == 0) {
                store.getState().players.forEach(player => {
                    if (player.name === this.name) {
                        const idx = store.getState().players.indexOf(player)
                        player.element.remove()
                        store.getState().players.splice(idx, 1)
                    }
                })
                return
            }
            this.revive = true;
            this.alive = true;
            this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
            setTimeout(() => {
                this.element.classList.add('opacity1')
                this.revive = false;
            }, 2000)
        }, 2000)
    }
}