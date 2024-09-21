const NEKO_ID = "oneko";
const NEKO_IMAGE_URL = "/oneko.gif";
const NEKO_WIDTH = 32;
const NEKO_HEIGHT = 32;
const NEKO_HALF_WIDTH = NEKO_WIDTH / 2;
const NEKO_HALF_HEIGHT = NEKO_HEIGHT / 2;
const NEKO_SPEED = 20;
const FRAME_RATE = 300;
const Z_INDEX = Number.MAX_SAFE_INTEGER;
const ALERT_TIME = 3;
const IDLE_THRESHOLD = 3;
const IDLE_ANIMATION_CHANCE = 1 / 20;
const MIN_DISTANCE = 10;

export class Neko {
  posX: number;
  posY: number;
  initialPosX: number;
  initialPosY: number;
  mouseX: number;
  mouseY: number;
  frameCount: number;
  idleTime: number;
  idleAnimation: string | null;
  idleAnimationFrame: number;
  isFollowing: boolean;
  isReturningToOrigin: boolean;
  nekoElement: HTMLElement | null;
  lastFrameTimestamp: number | null;
  animationFrameId: number | null;
  spriteSets: Record<string, [number, number][]>;
  isReducedMotion: boolean;

  constructor() {
    this.posX = NEKO_HALF_WIDTH;
    this.posY = NEKO_HALF_HEIGHT;
    this.initialPosX = this.posX;
    this.initialPosY = this.posY;
    this.mouseX = 0;
    this.mouseY = 0;
    this.frameCount = 0;
    this.idleTime = 0;
    this.idleAnimation = null;
    this.idleAnimationFrame = 0;
    this.isFollowing = false;
    this.isReturningToOrigin = false;
    this.nekoElement = null;
    this.lastFrameTimestamp = null;
    this.animationFrameId = null;
    this.isReducedMotion = window.matchMedia(
      `(prefers-reduced-motion: reduce)`
    ).matches;

    this.spriteSets = {
      idle: [[-3, -3]],
      alert: [[-7, -3]],
      scratchSelf: [
        [-5, 0],
        [-6, 0],
        [-7, 0],
      ],
      scratchWallN: [
        [0, 0],
        [0, -1],
      ],
      scratchWallS: [
        [-7, -1],
        [-6, -2],
      ],
      scratchWallE: [
        [-2, -2],
        [-2, -3],
      ],
      scratchWallW: [
        [-4, 0],
        [-4, -1],
      ],
      tired: [[-3, -2]],
      sleeping: [
        [-2, 0],
        [-2, -1],
      ],
      N: [
        [-1, -2],
        [-1, -3],
      ],
      NE: [
        [0, -2],
        [0, -3],
      ],
      E: [
        [-3, 0],
        [-3, -1],
      ],
      SE: [
        [-5, -1],
        [-5, -2],
      ],
      S: [
        [-6, -3],
        [-7, -2],
      ],
      SW: [
        [-5, -3],
        [-6, -1],
      ],
      W: [
        [-4, -2],
        [-4, -3],
      ],
      NW: [
        [-1, 0],
        [-1, -1],
      ],
    };
  }

  init() {
    if (this.isReducedMotion) return;
    if (document.getElementById(NEKO_ID)) return;

    this.createNekoElement();
    this.addEventListeners();
    this.animationLoop();
  }

  createNekoElement() {
    this.nekoElement = document.createElement("div");

    this.nekoElement.id = NEKO_ID;
    this.nekoElement.ariaHidden = "true";
    this.nekoElement.style.width = `${NEKO_WIDTH}px`;
    this.nekoElement.style.height = `${NEKO_HEIGHT}px`;
    this.nekoElement.style.position = "fixed";
    this.nekoElement.style.pointerEvents = "auto";
    this.nekoElement.style.imageRendering = "pixelated";
    this.nekoElement.style.left = `${this.posX - NEKO_HALF_WIDTH}px`;
    this.nekoElement.style.top = `${this.posY - NEKO_HALF_HEIGHT}px`;
    this.nekoElement.style.zIndex = Z_INDEX.toString();
    this.nekoElement.style.backgroundImage = `url("${NEKO_IMAGE_URL}")`;

    const idleSprite = this.spriteSets["idle"]
      ? this.spriteSets["idle"][0]
      : null;
    if (idleSprite) {
      this.nekoElement.style.backgroundPosition = `${
        idleSprite[0] * NEKO_WIDTH
      }px ${idleSprite[1] * NEKO_HEIGHT}px`;
    }

    document.body.appendChild(this.nekoElement);
  }

  addEventListeners() {
    if (!this.nekoElement) return;

    this.nekoElement.addEventListener("click", () => {
      this.isFollowing = !this.isFollowing;
      if (this.isFollowing) {
        this.isReturningToOrigin = false;
      } else {
        this.isReturningToOrigin = true;
      }
    });

    document.addEventListener("mousemove", (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    });
  }

  animationLoop() {
    const loop = (timestamp: number) => {
      if (this.lastFrameTimestamp === null) {
        this.lastFrameTimestamp = timestamp;
      }
      if (timestamp - this.lastFrameTimestamp > FRAME_RATE) {
        this.lastFrameTimestamp = timestamp;
        this.updateState();
        this.render();
      }
      this.animationFrameId = window.requestAnimationFrame(loop);
    };
    this.animationFrameId = window.requestAnimationFrame(loop);
  }

  updateState() {
    this.frameCount += 1;

    if (this.isReturningToOrigin) {
      this.moveToInitialPosition();
    } else if (this.isFollowing) {
      this.followMouse();
    } else {
      this.idleBehavior();
    }
  }

  render() {
    if (!this.nekoElement) return;
    this.nekoElement.style.left = `${this.posX - NEKO_HALF_WIDTH}px`;
    this.nekoElement.style.top = `${this.posY - NEKO_HALF_HEIGHT}px`;
  }

  setSprite(name: string, frame: number) {
    if (!this.nekoElement) return;
    const spriteSet = this.spriteSets[name];
    if (!spriteSet) return;
    const sprite = spriteSet[frame % spriteSet.length];
    if (sprite) {
      this.nekoElement.style.backgroundPosition = `${
        sprite[0] * NEKO_WIDTH
      }px ${sprite[1] * NEKO_HEIGHT}px`;
    }
  }

  resetIdleAnimation() {
    this.idleAnimation = null;
    this.idleAnimationFrame = 0;
  }

  idleBehavior() {
    this.idleTime += 1;

    if (
      this.idleTime > IDLE_THRESHOLD &&
      Math.random() < IDLE_ANIMATION_CHANCE &&
      this.idleAnimation == null
    ) {
      const availableIdleAnimations = ["sleeping", "scratchSelf"];
      if (this.posX < NEKO_WIDTH) availableIdleAnimations.push("scratchWallW");
      if (this.posY < NEKO_HEIGHT) availableIdleAnimations.push("scratchWallN");
      if (this.posX > window.innerWidth - NEKO_WIDTH)
        availableIdleAnimations.push("scratchWallE");
      if (this.posY > window.innerHeight - NEKO_HEIGHT)
        availableIdleAnimations.push("scratchWallS");
      this.idleAnimation =
        availableIdleAnimations[
          Math.floor(Math.random() * availableIdleAnimations.length)
        ] || null;
    }

    switch (this.idleAnimation) {
      case "sleeping":
        if (this.idleAnimationFrame < 8) {
          this.setSprite("tired", 0);
          break;
        }
        this.setSprite("sleeping", Math.floor(this.idleAnimationFrame / 4));
        if (this.idleAnimationFrame > 192) {
          this.resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        this.setSprite(this.idleAnimation, this.idleAnimationFrame);
        if (this.idleAnimationFrame > 9) {
          this.resetIdleAnimation();
        }
        break;
      default:
        this.setSprite("idle", 0);
        return;
    }
    this.idleAnimationFrame += 1;
  }

  followMouse() {
    const diffX = this.posX - this.mouseX;
    const diffY = this.posY - this.mouseY;
    const distance = Math.hypot(diffX, diffY);

    if (distance < NEKO_SPEED || distance < MIN_DISTANCE) {
      this.idleBehavior();
      return;
    }

    this.idleAnimation = null;
    this.idleAnimationFrame = 0;

    if (this.idleTime > 1) {
      this.setSprite("alert", 0);
      this.idleTime = Math.min(this.idleTime, ALERT_TIME);
      this.idleTime -= 1;
      return;
    }

    let direction = "";
    direction += diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    this.setSprite(direction, this.frameCount);

    this.posX -= (diffX / distance) * NEKO_SPEED;
    this.posY -= (diffY / distance) * NEKO_SPEED;

    // ensures neko stays within window bounds
    this.posX = Math.min(
      Math.max(NEKO_HALF_WIDTH, this.posX),
      window.innerWidth - NEKO_HALF_WIDTH
    );
    this.posY = Math.min(
      Math.max(NEKO_HALF_HEIGHT, this.posY),
      window.innerHeight - NEKO_HALF_HEIGHT
    );
  }

  moveToInitialPosition() {
    const diffX = this.posX - this.initialPosX;
    const diffY = this.posY - this.initialPosY;
    const distance = Math.hypot(diffX, diffY);

    if (distance < NEKO_SPEED) {
      this.posX = this.initialPosX;
      this.posY = this.initialPosY;
      this.isReturningToOrigin = false;
      this.idleBehavior();
      return;
    }

    let direction = "";
    direction += diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    this.setSprite(direction, this.frameCount);

    this.posX -= (diffX / distance) * NEKO_SPEED;
    this.posY -= (diffY / distance) * NEKO_SPEED;
  }

  destroy() {
    if (this.nekoElement) {
      this.nekoElement.remove();
      this.nekoElement = null;
    }
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }
}
