import { Render, store, id } from "./game.js";

export class Bomb {
  constructor(i, j, size, owner) {
    this.owner = owner
    this.element = document.getElementById(`${i}#${j}`)
    this.i = i;
    this.j = j;
    this.size = size;
    this.sprite = {
      framesize: size,
      currentFrame: 0,
      frameCount: 5,
      lastUpdate: 0,
      animationSpeed: 100,
    }

    this.explotionSprite = {
      framesize: this.size,
      currentFrame: 0,
      frameCount: 7,
      lastUpdate: 0,
      animationSpeed: 100,
    }
    this.animations = []
    this.element.style.backgroundSize = `${5 * this.size}px, ${this.size}px`;
    this.element.classList.add("bomb");
  }

  animate(currentTime) {
    if (currentTime - this.sprite.lastUpdate > this.sprite.animationSpeed) {
      this.sprite.currentFrame = (this.sprite.currentFrame + 1) % this.sprite.frameCount;
      this.sprite.lastUpdate = currentTime;
      const x = this.sprite.currentFrame * this.sprite.framesize;
      this.element.style.backgroundPosition = `-${x}px 0px`;
    }
  }

  explod() {
    store.getState().room.map[this.i][this.j] = 0
    this.element.classList.remove("bomb")
    const idx = this.owner.bombs.indexOf(this)
    this.owner.explotionBombs.push(this)
    this.setUpBg(`url('./images/explosion/center.png')`, 7, 1, this.element)
    this.animationObj(this.element, 2)
    setTimeout(() => {
      const idx = this.owner.explotionBombs.indexOf(this)
      this.owner.explotionBombs.splice(idx, 1)
      this.element.style.backgroundImage = '';
    }, 700)

    if (idx != -1) this.owner.bombs.splice(idx, 1)

    const dirs = [[1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1]]
    for (let r = 1; r <= this.owner.bombRange; r++) {
      dirs.forEach(([c, dx, dy], i) => {
        const ni = this.i + dx * r, nj = this.j + dy * r
        if (ni >= 0 && ni <= 12 && nj >= 0 && nj <= 14) {
          const val = store.getState().room.map[ni][nj]
          if (c == 1) {
            const el = document.getElementById(`${ni}#${nj}`)
            if (val == 1 || val == 2 || val == 5) {
              let classN = store.getState().room.powerUps[`_${ni}_${nj}`];

              dirs[i][0] = 0;
              if (val == 1) {
                setTimeout(() => {
                  el.classList.remove("soft");
                  el.classList.add("empty");
                  if (classN) el.classList.add(classN);
                  store.getState().room.map[ni][nj] = 0;
                }, 300)
              }
            } else {
              store.getState().players.forEach(player => {
                const pi = Math.trunc((player.position.y + (player.size * 0.5)) / this.size)
                const pj = Math.trunc((player.position.x + (player.size * 0.5)) / this.size)
                const powerUp = store.getState().room.powerUps[`_${ni}_${nj}`]
                if (powerUp) {
                  store.getState().room.powerUps[`_${ni}_${nj}`] = "";
                  el.classList.remove(powerUp)
                }
                if (i == 0) {
                  if (r == this.owner.bombRange) {
                    this.setUpBg(`url('./images/explosion/downTail.png')`, 1, 7, el)
                  } else {
                    this.setUpBg(`url('./images/explosion/midleDown.png')`, 1, 7, el)
                  }
                  this.animationObj(el, 0)
                } else if (i == 1) {
                  if (r == this.owner.bombRange) {
                    this.setUpBg(`url('./images/explosion/upTail.png')`, 1, 7, el)
                  } else {
                    this.setUpBg(`url('./images/explosion/midleUp.png')`, 1, 7, el)
                  }
                  this.animationObj(el, 1)
                } else if (i == 2) {
                  if (r == this.owner.bombRange) {
                    this.setUpBg(`url('./images/explosion/rightTail.png')`, 7, 1, el)
                  } else {
                    this.setUpBg(`url('./images/explosion/midleRight.png')`, 7, 1, el)
                  }
                  this.animationObj(el, 2)
                } else {
                  if (r == this.owner.bombRange) {
                    this.setUpBg(`url('./images/explosion/leftTail.png')`, 7, 1, el)
                  } else {
                    this.setUpBg(`url('./images/explosion/midleLeft.png')`, 7, 1, el)
                  }
                  this.animationObj(el, 3)
                }

                setTimeout(() => {
                  if(el)el.style.backgroundImage = '';
                }, 700)

                if (((pi == ni && pj == nj) || (pi == this.i && pj == this.j)) && player.alive && !player.revive) {
                  player.death()
                  setTimeout(() => {
                    if (store.getState().players.length == 1 || store.getState().players.length == 0) {
                      cancelAnimationFrame(id)
                      Render("game over")
                    }
                  }, 2025)
                }
              })
            }
          }
        }
      })
    }
  }

  Explotion(currentTime, obj) {
    if (currentTime - obj.lastUpdate > 100) {
      obj.currentFrame = (obj.currentFrame + 1) % obj.frameCount;
      obj.lastUpdate = currentTime;
      const x = obj.currentFrame * obj.framesize;
      obj.el.style.backgroundPosition = `${x * obj.d * obj.h}px ${x * obj.d * obj.v}px`;
    }
  }

  animationObj(el, i) {
    let d, h, v
    if (i == 0) { d = -1; h = 0, v = 1 }
    if (i == 1) { d = 1; h = 0, v = 1 }
    if (i == 2) { d = -1; h = 1, v = 0 }
    if (i == 3) { d = 1; h = 1, v = 0 }
    const obj = {
      el,
      framesize: this.size,
      currentFrame: 0,
      lastUpdate: 0,
      frameCount: 7,
      h,
      v,
      d
    }

    if (i == 1 || i == 3) obj.currentFrame = 1;
    this.animations.push([obj, this.Explotion])
  }

  handleExplotionAnimation(time) {
    this.animations.forEach(([el, fn]) => {
      fn(time, el)
    })
  }

  setUpBg(url, x, y, el) {
    if (el) {
      el.style.backgroundSize = `${this.size * x}px ${this.size * y}px`;
      el.style.backgroundImage = url;
    }

  }
}