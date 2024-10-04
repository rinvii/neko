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
const SPRITE_GAP = 1;
const BACKGROUND_TARGET_COLOR = [0, 174, 240] as [number, number, number];
const AXIS_THRESHOLD = 4;

// TODO: offset neko when dragging

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
  nekoImageUrl: string;
  nekoName: string;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  wasDragged: boolean;
  isMouseMoving: boolean = false;
  mouseMoveTimeoutId: number | null = null;
  dragAnimationLastTimestamp: number | null = null;
  currentScratchSprite: string | null = null;

  constructor({
    nekoName,
    nekoImageUrl,
    initialPosX,
    initialPosY,
  }: {
    nekoName: string;
    nekoImageUrl: string;
    initialPosX?: number;
    initialPosY?: number;
  }) {
    this.nekoName = nekoName;
    this.nekoImageUrl = nekoImageUrl;
    this.posX = initialPosX !== undefined ? initialPosX : NEKO_HALF_WIDTH;
    this.posY = initialPosY !== undefined ? initialPosY : NEKO_HALF_HEIGHT;
    this.initialPosX = initialPosX !== undefined ? initialPosX : this.posX;
    this.initialPosY = initialPosY !== undefined ? initialPosY : this.posY;
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
    this.isDragging = false;
    this.wasDragged = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.currentScratchSprite = null;
    this.spriteSets = {
      idle: [[0, 0]],
      alert: [[7, 0]],
      lickPaw: [[1, 0]],
      scratchSelf: [
        [2, 0],
        [3, 0],
      ],
      scratchWallS: [
        [0, 3],
        [1, 3],
      ],
      scratchWallE: [
        [2, 3],
        [3, 3],
      ],
      scratchWallN: [
        [4, 3],
        [5, 3],
      ],
      scratchWallW: [
        [6, 3],
        [7, 3],
      ],
      tired: [[4, 0]],
      sleeping: [
        [5, 0],
        [6, 0],
      ],
      S: [
        [0, 1],
        [1, 1],
      ],
      SE: [
        [2, 1],
        [3, 1],
      ],
      E: [
        [4, 1],
        [5, 1],
      ],
      NE: [
        [6, 1],
        [7, 1],
      ],
      N: [
        [0, 2],
        [1, 2],
      ],
      NW: [
        [2, 2],
        [3, 2],
      ],
      W: [
        [4, 2],
        [5, 2],
      ],
      SW: [
        [6, 2],
        [7, 2],
      ],
    };
  }

  init() {
    if (this.isReducedMotion) return;
    if (document.getElementById(this.nekoName)) return;

    this.createNekoElement();
    this.addEventListeners();
    this.animationLoop();
  }

  static async makeTransparent(
    imageUrl: string,
    targetColor: [number, number, number]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageUrl;
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return reject("Canvas not supported");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (
            r === targetColor[0] &&
            g === targetColor[1] &&
            b === targetColor[2]
          ) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        const transparentImageUrl = canvas.toDataURL("image/png");
        resolve(transparentImageUrl);
      };

      img.onerror = (err) => reject(err);
    });
  }

  async createNekoElement() {
    this.nekoElement = document.createElement("div");

    this.nekoElement.id = this.nekoName;
    this.nekoElement.ariaHidden = "true";
    this.nekoElement.style.width = `${NEKO_WIDTH}px`;
    this.nekoElement.style.height = `${NEKO_HEIGHT}px`;
    this.nekoElement.style.position = "fixed";
    this.nekoElement.style.pointerEvents = "auto";
    this.nekoElement.style.imageRendering = "pixelated";
    this.nekoElement.style.left = `${this.posX - NEKO_HALF_WIDTH}px`;
    this.nekoElement.style.top = `${this.posY - NEKO_HALF_HEIGHT}px`;
    this.nekoElement.style.zIndex = Z_INDEX.toString();
    this.nekoElement.style.backgroundImage = `url("${this.nekoImageUrl}")`;
    this.nekoElement.style.cursor = "grab";

    try {
      const transparentImageUrl = await Neko.makeTransparent(
        this.nekoImageUrl,
        BACKGROUND_TARGET_COLOR
      );

      if (this.nekoElement) {
        this.nekoElement.style.backgroundImage = `url("${transparentImageUrl}")`;
      }

      if (this.nekoElement) {
        document.body.appendChild(this.nekoElement);
      } else {
        throw new Error("Neko element is null, cannot append to document.");
      }
    } catch (err) {
      console.error("Failed to process the image:", err);
    }

    const idleSprite = this.spriteSets["idle"]
      ? this.spriteSets["idle"][0]
      : null;
    if (idleSprite && this.nekoElement) {
      const posX = idleSprite[0] * (NEKO_WIDTH + SPRITE_GAP);
      const posY = idleSprite[1] * (NEKO_HEIGHT + SPRITE_GAP);
      this.nekoElement.style.backgroundPosition = `-${posX}px -${posY}px`;
    }
  }

  private updateDraggingSprite(dx: number, dy: number, timeStamp: number) {
    if (!this.isMouseMoving) {
      return;
    }

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let spriteName: string;

    if (absDx - absDy > AXIS_THRESHOLD) {
      if (dx > 0) {
        spriteName = "scratchWallW";
      } else {
        spriteName = "scratchWallE";
      }
    } else if (absDy - absDx > AXIS_THRESHOLD) {
      if (dy > 0) {
        spriteName = "scratchWallN";
      } else {
        spriteName = "scratchWallS";
      }
    } else {
      spriteName = this.currentScratchSprite || "idle";
    }

    this.currentScratchSprite = spriteName;

    if (this.dragAnimationLastTimestamp === null) {
      this.dragAnimationLastTimestamp = timeStamp;
    }

    const timeSinceLastFrame = timeStamp - this.dragAnimationLastTimestamp;

    const DRAG_ANIMATION_FRAME_INTERVAL = 100;

    if (timeSinceLastFrame >= DRAG_ANIMATION_FRAME_INTERVAL) {
      this.idleAnimationFrame += 1;
      this.dragAnimationLastTimestamp = timeStamp;
    }

    const frameIndex =
      (this.spriteSets[spriteName]?.length ?? 0) > 0
        ? this.idleAnimationFrame % (this.spriteSets[spriteName]?.length ?? 1)
        : 0;
    this.setSprite(spriteName, frameIndex);
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (this.isDragging) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      const movementDistance = Math.hypot(dx, dy);

      const MOVEMENT_THRESHOLD = 2;

      if (!this.wasDragged) {
        if (movementDistance > MOVEMENT_THRESHOLD) {
          this.wasDragged = true;
        } else {
          this.setSprite("alert", 0);
          this.render();

          this.lastMouseX = event.clientX;
          this.lastMouseY = event.clientY;
          return;
        }
      }

      this.isMouseMoving = true;

      if (this.mouseMoveTimeoutId !== null) {
        clearTimeout(this.mouseMoveTimeoutId);
      }

      this.mouseMoveTimeoutId = window.setTimeout(() => {
        this.isMouseMoving = false;

        this.setSprite("alert", 0);
        this.render();
      }, 100);

      this.posX = event.clientX;
      this.posY = event.clientY;

      this.updateDraggingSprite(dx, dy, event.timeStamp);

      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      this.render();
    } else {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    }
  };

  private handleMouseDown = (event: MouseEvent) => {
    this.isDragging = true;
    this.wasDragged = false;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.idleAnimationFrame = 0;
    this.dragAnimationLastTimestamp = null;
    this.isMouseMoving = false;

    if (this.nekoElement) {
      this.nekoElement.style.cursor = "grabbing";
    }

    this.setSprite("alert", 0);
    this.render();
    event.preventDefault();
  };

  private handleMouseUp = () => {
    this.isDragging = false;
    this.idleAnimationFrame = 0;
    this.dragAnimationLastTimestamp = null;
    this.isMouseMoving = false;
    this.currentScratchSprite = null;

    if (this.nekoElement) {
      this.nekoElement.style.cursor = "grab";
    }

    if (this.mouseMoveTimeoutId !== null) {
      clearTimeout(this.mouseMoveTimeoutId);
      this.mouseMoveTimeoutId = null;
    }
  };

  addEventListeners() {
    if (!this.nekoElement) return;

    this.nekoElement.addEventListener("click", () => {
      if (!this.wasDragged) {
        this.isFollowing = !this.isFollowing;
        if (this.isFollowing) {
          this.isReturningToOrigin = false;
        } else {
          this.isReturningToOrigin = true;
        }
      }
    });

    this.nekoElement.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("mousemove", this.handleMouseMove);
  }

  animationLoop() {
    const loop = (timestamp: number) => {
      if (this.lastFrameTimestamp === null) {
        this.lastFrameTimestamp = timestamp;
      }

      const delta = timestamp - this.lastFrameTimestamp;

      if (this.isDragging || delta > FRAME_RATE) {
        this.lastFrameTimestamp = timestamp;
        this.updateState();

        if (!this.isDragging) {
          this.render();
        }
      }

      this.animationFrameId = window.requestAnimationFrame(loop);
    };
    this.animationFrameId = window.requestAnimationFrame(loop);
  }

  updateState() {
    if (this.isDragging) {
      return;
    }

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
      const posX = sprite[0] * (NEKO_WIDTH + SPRITE_GAP);
      const posY = sprite[1] * (NEKO_HEIGHT + SPRITE_GAP);

      this.nekoElement.style.backgroundPosition = `-${posX}px -${posY}px`;
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
      const availableIdleAnimations = [
        "sleeping",
        "scratchSelf",
        "lickPaw",
        "scratchWallW",
        "scratchWallN",
        "scratchWallE",
        "scratchWallS",
      ];

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
        } else if (this.idleAnimationFrame < 16) {
          this.setSprite("idle", 0);
          break;
        }
        this.setSprite("sleeping", Math.floor(this.idleAnimationFrame / 4));
        if (this.idleAnimationFrame > 192) {
          this.resetIdleAnimation();
        }
        break;
      case "lickPaw":
        this.setSprite("lickPaw", 0);
        if (this.idleAnimationFrame > 4) {
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
      this.nekoElement.removeEventListener("mousedown", this.handleMouseDown);
      this.nekoElement.remove();
      this.nekoElement = null;
    }
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
    }
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  }
}
