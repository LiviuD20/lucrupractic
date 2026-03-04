// game.js - Cyber Arena Survival
// Clase OOP pentru gestionare joc

// Resurse audio
const bgMusic = new Audio("assets/bg-music.mp3");
bgMusic.loop = true;
const shootSound = new Audio("assets/shoot.mp3");
const hitSound = new Audio("assets/hit.mp3");
const powerupSound = new Audio("assets/powerup.mp3");
const explosionSound = new Audio("assets/explosion.mp3");

// Imagini (preload)
const images = {
  player: new Image(),
  enemy: new Image(),
  boss: new Image(),
  projectile: new Image(),
  powerup: new Image(),
};
images.player.src = "assets/player.png";
images.enemy.src = "assets/enemy.png";
images.boss.src = "assets/boss.png";
images.projectile.src = "assets/projectile.png";
images.powerup.src = "assets/powerup.png";

// Elemente DOM
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const timerEl = document.getElementById("timer");
const fpsEl = document.getElementById("fps");
const hpFill = document.getElementById("hpFill");
const menu = document.getElementById("menu");
const gameArea = document.getElementById("gameArea");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const instructionsBtn = document.getElementById("instructionsBtn");
const instructions = document.getElementById("instructions");
const toggleMode = document.getElementById("toggleMode");

// Variabile globale
let animationId;
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let gameTime = 0;
let paused = false;
let gameOver = false;
let score = 0;
let level = 1;
let hp = 100; // Vieți
let maxHp = 100;
let keys = {};
let messages = []; // Mesaje temporare {text, x, y, time}

// Clasa de bază pentru entități
class Entity {
  constructor(x, y, width, height, image) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = image;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    // Exemplu transform: scale pentru puls (opțional)
    const scale = 1 + Math.sin(Date.now() / 500) * 0.05;
    ctx.scale(scale, scale);
    ctx.drawImage(
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    ctx.restore();
  }

  update() {} // Suprascris în subclase

  checkCollision(other) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}

// Clasa Player (extinde Entity)
class Player extends Entity {
  constructor() {
    super(canvas.width / 2 - 25, canvas.height - 100, 50, 50, images.player);
    this.speed = 5;
    this.shield = false; // Power-up
  }

  update() {
    if (keys["ArrowLeft"] || keys["a"]) this.x -= this.speed;
    if (keys["ArrowRight"] || keys["d"]) this.x += this.speed;
    if (keys["ArrowUp"] || keys["w"]) this.y -= this.speed;
    if (keys["ArrowDown"] || keys["s"]) this.y += this.speed;

    // Limite canvas
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
  }

  shoot() {
    projectiles.push(
      new Projectile(
        this.x + this.width / 2 - 5,
        this.y,
        10,
        20,
        images.projectile,
      ),
    );
    shootSound.play();
  }
}

// Clasa Enemy (bază)
class Enemy extends Entity {
  constructor(x, y, width, height, image) {
    super(x, y, width, height, image);
    this.speed = 2 + level * 0.5;
  }

  update() {
    this.y += this.speed;
    if (this.y > canvas.height) {
      // Respawn sus
      this.y = -this.height;
      this.x = Math.random() * (canvas.width - this.width);
    }
  }
}

// Clasa EnemyBoss (moștenire din Enemy)
class EnemyBoss extends Enemy {
  constructor() {
    super(Math.random() * (canvas.width - 100), -100, 100, 100, images.boss);
    this.speed = 1.5;
    this.health = 50; // Boss cu mai multă viață
  }

  update() {
    super.update();
    // Mișcare sinusală
    this.x += Math.sin(Date.now() / 500) * 3;
    // Rotație
    // În draw, adaugă rotate
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(Date.now() / 1000); // Rotație boss
    ctx.drawImage(
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    ctx.restore();
  }
}

// Clasa Projectile
class Projectile extends Entity {
  constructor(x, y, width, height, image) {
    super(x, y, width, height, image);
    this.speed = -10; // Sus
  }

  update() {
    this.y += this.speed;
    if (this.y < -this.height) {
      // Șterge
      const index = projectiles.indexOf(this);
      if (index > -1) projectiles.splice(index, 1);
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(Math.PI / 4); // Rotație proiectil 45 grade
    ctx.drawImage(
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    ctx.restore();
  }
}

// Clasa PowerUp
class PowerUp extends Entity {
  constructor() {
    super(Math.random() * (canvas.width - 30), -30, 30, 30, images.powerup);
    this.speed = 3;
  }

  update() {
    this.y += this.speed;
    if (this.y > canvas.height) {
      const index = powerups.indexOf(this);
      if (index > -1) powerups.splice(index, 1);
    }
  }
}

// Clasa GameManager
class GameManager {
  constructor() {
    this.player = new Player();
    this.enemies = [];
    this.projectiles = [];
    this.powerups = [];
    this.spawnInterval = null;
    this.powerupInterval = null;
    this.bossSpawned = false;
  }

  start() {
    // Spawn inamici cu setInterval
    this.spawnInterval = setInterval(() => this.spawnEnemy(), 2000 / level);
    // Power-ups la fiecare 10s cu setTimeout recursiv
    this.spawnPowerUp();
    // Timer joc
    setInterval(() => {
      if (!paused && !gameOver) gameTime++;
      timerEl.textContent = gameTime;
    }, 1000);
    bgMusic.play();
  }

  spawnEnemy() {
    if (Math.random() < 0.1 && level >= 3 && !this.bossSpawned) {
      // 10% șansă boss la nivel 3+
      this.enemies.push(new EnemyBoss());
      this.bossSpawned = true;
    } else {
      this.enemies.push(
        new Enemy(
          Math.random() * (canvas.width - 40),
          -40,
          40,
          40,
          images.enemy,
        ),
      );
    }
  }

  spawnPowerUp() {
    this.powerups.push(new PowerUp());
    setTimeout(() => {
      if (!gameOver) this.spawnPowerUp();
    }, 10000); // Fiecare 10s
  }

  update() {
    this.player.update();

    this.projectiles.forEach((p) => p.update());
    this.enemies.forEach((e) => e.update());
    this.powerups.forEach((p) => p.update());

    // Coliziuni
    this.enemies.forEach((e, ei) => {
      this.projectiles.forEach((p, pi) => {
        if (e.checkCollision(p)) {
          this.projectiles.splice(pi, 1);
          if (e instanceof EnemyBoss) {
            e.health -= 10;
            if (e.health <= 0) {
              this.enemies.splice(ei, 1);
              explosionSound.play();
              score += 50;
              this.bossSpawned = false;
              messages.push({
                text: "Boss Distrus!",
                x: canvas.width / 2,
                y: canvas.height / 2,
                time: 2000,
              });
            }
          } else {
            this.enemies.splice(ei, 1);
            score += 10;
          }
          hitSound.play();
        }
      });

      if (e.checkCollision(this.player)) {
        if (!this.player.shield) {
          hp -= 10;
          hitSound.play();
          canvas.classList.add("flash");
          setTimeout(() => canvas.classList.remove("flash"), 200); // Screen flash cu CSS
          if (hp <= 0) this.endGame();
        }
        this.enemies.splice(ei, 1);
      }
    });

    this.powerups.forEach((p, pi) => {
      if (p.checkCollision(this.player)) {
        this.powerups.splice(pi, 1);
        this.player.shield = true;
        powerupSound.play();
        messages.push({
          text: "Shield Activat!",
          x: this.player.x,
          y: this.player.y - 20,
          time: 3000,
        });
        setTimeout(() => (this.player.shield = false), 5000); // Shield 5s
      }
    });

    // Nivel progresiv
    if (score > level * 100) {
      level++;
      levelEl.textContent = level;
      clearInterval(this.spawnInterval);
      this.spawnInterval = setInterval(() => this.spawnEnemy(), 2000 / level);
      messages.push({
        text: "Level Up!",
        x: canvas.width / 2,
        y: canvas.height / 2,
        time: 2000,
      });
    }

    // Actualizare UI
    scoreEl.textContent = score;
    hpFill.style.width = `${(hp / maxHp) * 100}%`;
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundal particule simple (efect cyber)
    ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillRect(x, y, 2, 2);
    }

    this.player.draw();
    this.projectiles.forEach((p) => p.draw());
    this.enemies.forEach((e) => e.draw());
    this.powerups.forEach((p) => p.draw());

    // Mesaje temporare
    messages.forEach((m, i) => {
      ctx.fillStyle = "#0ff";
      ctx.font = "20px Arial";
      ctx.fillText(m.text, m.x, m.y);
      m.time -= 16; // ~60fps
      if (m.time <= 0) messages.splice(i, 1);
    });
  }

  endGame() {
    gameOver = true;
    cancelAnimationFrame(animationId);
    clearInterval(this.spawnInterval);
    bgMusic.pause();
    localStorage.setItem(
      "highScore",
      Math.max(score, localStorage.getItem("highScore") || 0),
    );
    messages.push({
      text: "Game Over! Scor: " + score,
      x: canvas.width / 2,
      y: canvas.height / 2,
      time: Infinity,
    });
    restartBtn.style.display = "inline";
  }
}

// Instanțe
let gameManager;

// Evenimente
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " && !paused && !gameOver) gameManager.player.shoot();
  if (e.key === "p") {
    paused = !paused;
    if (paused) bgMusic.pause();
    else bgMusic.play();
  }
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
instructionsBtn.addEventListener(
  "click",
  () =>
    (instructions.style.display =
      instructions.style.display === "none" ? "block" : "none"),
);
toggleMode.addEventListener("click", () =>
  document.body.classList.toggle("dark-mode"),
);

function startGame() {
  menu.style.display = "none";
  gameArea.style.display = "block";
  restartBtn.style.display = "none";
  gameOver = false;
  paused = false;
  score = 0;
  level = 1;
  hp = 100;
  gameTime = 0;
  messages = [];
  gameManager = new GameManager();
  gameManager.start();
  loop(performance.now());
}

// Bucla principală cu requestAnimationFrame
function loop(timestamp) {
  if (paused || gameOver) return;

  // Calcul FPS
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  frameCount++;
  if (delta > 1000) {
    fps = Math.round(frameCount / (delta / 1000));
    fpsEl.textContent = fps;
    frameCount = 0;
    lastTime = timestamp;
  }

  gameManager.update();
  gameManager.draw();

  animationId = requestAnimationFrame(loop);
}

// Încarcă high score
console.log("High Score anterior: " + localStorage.getItem("highScore"));
