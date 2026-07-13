'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const BASE_W = 1000;
const BASE_H = 600;
const MAX_TOWER_LEVEL = 3;

const TOWER_TYPES = {
  slinger: {
    name: 'Orange Snacker', emoji: '🍊', projectile: '🍊', cost: 60,
    range: 125, damage: 12, cooldown: 0.48, color: '#d7903f'
  },
  melon: {
    name: 'Spring Soaker', emoji: '💦', projectile: '💧', cost: 95,
    range: 145, damage: 26, cooldown: 1.25, splash: 65, color: '#ff6f7c'
  },
  chill: {
    name: 'Chill Capy', emoji: '🧊', projectile: '❄️', cost: 80,
    range: 115, damage: 7, cooldown: 0.72, slow: 0.45, slowTime: 1.8, color: '#65caf2'
  },
  basket: {
    name: 'Basket Snare', emoji: '🧺', cost: 45, trap: true,
    radius: 55, trapTime: 1.2, cooldown: 6, color: '#b8732f'
  }
};

const SPRITE_SOURCES = {
  slinger: 'assets/capy-reference/berry-slinger.png',
  melon: 'assets/capy-reference/melon-mortar.png',
  chill: 'assets/capy-reference/chill-capy.png',
  regular: 'assets/cheetahs/normal.png',
  swift: 'assets/cheetahs/swift.png',
  tanky: 'assets/cheetahs/tanky.png',
  boss: 'assets/cheetahs/boss.png',
  portal: 'assets/landmarks/cheetah-portal.png',
  palace: 'assets/landmarks/snack-palace.png'
};

const SPRITES = {};
for (const [key, src] of Object.entries(SPRITE_SOURCES)) {
  const image = new Image();
  image.src = src;
  SPRITES[key] = image;
}

function spriteReady(key) {
  const image = SPRITES[key];
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

const path = [
  { x: -55, y: 130 }, { x: 95, y: 130 }, { x: 180, y: 210 }, { x: 335, y: 210 },
  { x: 405, y: 125 }, { x: 565, y: 125 }, { x: 630, y: 250 }, { x: 540, y: 340 },
  { x: 355, y: 340 }, { x: 305, y: 440 }, { x: 435, y: 510 }, { x: 620, y: 480 },
  { x: 720, y: 390 }, { x: 815, y: 410 }, { x: 875, y: 500 }, { x: 1055, y: 500 }
];

const decor = [
  ['🌾', 75, 275, 20], ['🌾', 125, 320, 18], ['🌿', 230, 95, 20], ['🌻', 290, 120, 20],
  ['🌵', 465, 265, 23], ['🪨', 555, 260, 20], ['🌾', 685, 95, 20], ['🌴', 800, 130, 48],
  ['🌳', 900, 180, 57], ['🌾', 780, 300, 18], ['🌿', 920, 330, 21], ['🌻', 180, 500, 21],
  ['🪨', 85, 430, 26], ['🌴', 80, 540, 55], ['🌳', 720, 540, 49], ['🌾', 955, 80, 18],
  ['🦎', 245, 275, 18], ['🪨', 655, 575, 18], ['🌱', 480, 575, 18], ['🌵', 850, 75, 19]
];

let state;
let selectedTower = null;
let hoverPoint = null;
let lastTime = performance.now();
let toastTimer = 0;
let audioContext = null;
let soundOn = true;
let speed = 1;
let draggingTower = null;
let dragOrigin = null;
let dragStartPoint = null;
let dragMoved = false;
let dragPointerId = null;

const els = {
  coins: document.getElementById('coins'), lives: document.getElementById('lives'), wave: document.getElementById('wave'),
  bossAlert: document.getElementById('bossAlert'), pauseBtn: document.getElementById('pauseBtn'), speedBtn: document.getElementById('speedBtn'),
  startWaveBtn: document.getElementById('startWaveBtn'), topStartWaveBtn: document.getElementById('topStartWaveBtn'), waveStatus: document.getElementById('waveStatus'),
  waveDescription: document.getElementById('waveDescription'), waveProgress: document.getElementById('waveProgress'),
  enemyCount: document.getElementById('enemyCount'), waveIcon: document.getElementById('waveIcon'),
  toast: document.getElementById('toast'), countdown: document.getElementById('countdown'), welcomeCard: document.getElementById('welcomeCard'),
  endCard: document.getElementById('endCard'), endTitle: document.getElementById('endTitle'), endText: document.getElementById('endText'),
  endEmoji: document.getElementById('endEmoji'), soundBtn: document.getElementById('soundBtn'), helpDialog: document.getElementById('helpDialog'),
  autoStartBtn: document.getElementById('autoStartBtn'), towerInspector: document.getElementById('towerInspector'),
  inspectorImage: document.getElementById('inspectorImage'), inspectorLevel: document.getElementById('inspectorLevel'),
  inspectorEmoji: document.getElementById('inspectorEmoji'),
  inspectorName: document.getElementById('inspectorName'), inspectorDamage: document.getElementById('inspectorDamage'),
  inspectorRange: document.getElementById('inspectorRange'), inspectorSpeed: document.getElementById('inspectorSpeed'),
  inspectorDamageLabel: document.getElementById('inspectorDamageLabel'), inspectorRangeLabel: document.getElementById('inspectorRangeLabel'),
  inspectorSpeedLabel: document.getElementById('inspectorSpeedLabel'),
  upgradeTowerBtn: document.getElementById('upgradeTowerBtn'), sellTowerBtn: document.getElementById('sellTowerBtn')
};

function freshState() {
  return {
    coins: 180, lives: 20, wave: 0, towers: [], enemies: [], projectiles: [], particles: [], floaters: [],
    waveActive: false, spawning: false, spawnQueue: [], spawnTimer: 0, totalThisWave: 0, defeatedThisWave: 0,
    paused: false, gameOver: false, countdownActive: false, elapsed: 0, selectedPlaced: null,
    autoStart: false, autoStartCountdown: 0, portalPulse: 0, portalLabelUntil: 0,
    portalBossUntil: 0, palaceHit: 0, celebrationUntil: 0
  };
}

function init() {
  state = freshState();
  selectedTower = null;
  speed = 1;
  draggingTower = null;
  dragOrigin = null;
  dragStartPoint = null;
  dragMoved = false;
  dragPointerId = null;
  canvas.classList.remove('dragging');
  document.querySelectorAll('.tower-card').forEach((card) => {
    const active = card.dataset.tower === selectedTower;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  els.endCard.hidden = true;
  els.welcomeCard.hidden = false;
  updateUI();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(canvas.width / BASE_W, 0, 0, canvas.height / BASE_H, 0, 0);
}

function toGamePoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * BASE_W / rect.width,
    y: (event.clientY - rect.top) * BASE_H / rect.height
  };
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (!l2) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function nearestPointOnPath(point) {
  let nearest = { x: path[0].x, y: path[0].y, distance: Infinity };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const rawT = lengthSquared ? ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared : 0;
    const t = Math.max(0, Math.min(1, rawT));
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < nearest.distance) nearest = { x, y, distance };
  }
  return nearest;
}

function canPlace(point, ignoredTower = null) {
  if (point.x < 42 || point.x > BASE_W - 42 || point.y < 45 || point.y > BASE_H - 42) return false;
  if (point.x > 845 && point.y > 365) return false;
  for (let i = 0; i < path.length - 1; i++) {
    if (distanceToSegment(point, path[i], path[i + 1]) < 66) return false;
  }
  for (const tower of state.towers) {
    if (tower === ignoredTower) continue;
    if (Math.hypot(point.x - tower.x, point.y - tower.y) < 70) return false;
  }
  return true;
}

function canPlaceTrap(point, ignoredTower = null) {
  const nearest = nearestPointOnPath(point);
  if (nearest.distance > 43 || nearest.x < 35 || nearest.x > BASE_W - 35) return false;
  for (const tower of state.towers) {
    if (tower === ignoredTower) continue;
    if (Math.hypot(nearest.x - tower.x, nearest.y - tower.y) < 72) return false;
  }
  return true;
}

function canPlaceDefense(point, type, ignoredTower = null) {
  return TOWER_TYPES[type].trap ? canPlaceTrap(point, ignoredTower) : canPlace(point, ignoredTower);
}

function selectTower(type) {
  const wasSelected = selectedTower === type;
  selectedTower = wasSelected ? null : type;
  state.selectedPlaced = null;
  document.querySelectorAll('.tower-card').forEach((card) => {
    const active = card.dataset.tower === selectedTower;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  if (wasSelected) showToast('Placement mode cancelled');
  updateUI();
}

function clearPlacementSelection() {
  selectedTower = null;
  document.querySelectorAll('.tower-card').forEach((card) => {
    card.classList.remove('active');
    card.setAttribute('aria-pressed', 'false');
  });
}

function getTowerStats(tower) {
  const type = TOWER_TYPES[tower.type];
  const bonusLevels = tower.level - 1;
  if (type.trap) {
    return {
      damage: 0,
      range: type.radius + bonusLevels * 7,
      cooldown: type.cooldown * Math.pow(.86, bonusLevels),
      trapTime: type.trapTime + bonusLevels * .35,
      splash: 0,
      slowTime: 0
    };
  }
  return {
    damage: type.damage * (1 + bonusLevels * .38),
    range: type.range + bonusLevels * 12,
    cooldown: type.cooldown * Math.pow(.9, bonusLevels),
    splash: type.splash ? type.splash + bonusLevels * 7 : 0,
    slowTime: type.slowTime ? type.slowTime + bonusLevels * .25 : 0
  };
}

function getUpgradeCost(tower) {
  return Math.round(TOWER_TYPES[tower.type].cost * .75 * tower.level);
}

function getSellValue(tower) {
  return Math.floor(tower.invested * .65);
}

function towerAtPoint(point) {
  return state.towers.find((tower) => Math.hypot(point.x - tower.x, point.y - tower.y) <= 34) || null;
}

function beginTowerDrag(tower, point, pointerId) {
  draggingTower = tower;
  dragOrigin = { x: tower.x, y: tower.y };
  dragStartPoint = { x: point.x, y: point.y };
  dragMoved = false;
  dragPointerId = pointerId;
  state.selectedPlaced = tower;
  canvas.classList.add('dragging');
  updateUI();
}

function moveTowerDrag(point) {
  if (!draggingTower) return;
  if (!dragMoved && Math.hypot(point.x - dragStartPoint.x, point.y - dragStartPoint.y) > 8) dragMoved = true;
  if (!dragMoved) return;
  draggingTower.x = point.x;
  draggingTower.y = point.y;
}

function finishTowerDrag(cancelled = false) {
  if (!draggingTower) return;
  const tower = draggingTower;
  const valid = dragMoved && !cancelled && canPlaceDefense({ x: tower.x, y: tower.y }, tower.type, tower);

  if (dragMoved && valid) {
    if (TOWER_TYPES[tower.type].trap) {
      const snapped = nearestPointOnPath(tower);
      tower.x = snapped.x;
      tower.y = snapped.y;
    }
    tower.cooldown = Math.max(tower.cooldown, .2);
    burst(tower.x, tower.y, TOWER_TYPES[tower.type].color, 10);
    showToast(`${TOWER_TYPES[tower.type].name} repositioned!`);
    playTone(470, .08, 'sine', .02);
  } else if (dragMoved) {
    tower.x = dragOrigin.x;
    tower.y = dragOrigin.y;
    showToast('That drop is blocked — tower returned 🌿', true);
    playTone(150, .09, 'square', .02);
  }

  draggingTower = null;
  dragOrigin = null;
  dragStartPoint = null;
  dragMoved = false;
  dragPointerId = null;
  canvas.classList.remove('dragging');
  updateUI();
}

function upgradeSelectedTower() {
  const tower = state.selectedPlaced;
  if (!tower || tower.level >= MAX_TOWER_LEVEL) return;
  const cost = getUpgradeCost(tower);
  if (state.coins < cost) {
    showToast(`Need ${cost - state.coins} more coins to upgrade 🪙`, true);
    playTone(140, .11, 'sawtooth', .02);
    return;
  }
  state.coins -= cost;
  tower.invested += cost;
  tower.level += 1;
  tower.cooldown = Math.min(tower.cooldown, .15);
  burst(tower.x, tower.y, '#ffd347', 18);
  addFloater(tower.x, tower.y - 34, `LEVEL ${tower.level}!`, '#9a5a12');
  showToast(`${TOWER_TYPES[tower.type].name} upgraded to level ${tower.level}!`);
  playChord([380, 520, 680], .12);
  updateUI();
}

function sellSelectedTower() {
  const tower = state.selectedPlaced;
  if (!tower) return;
  const value = getSellValue(tower);
  state.coins += value;
  state.towers = state.towers.filter((candidate) => candidate !== tower);
  state.selectedPlaced = null;
  burst(tower.x, tower.y, '#e6b25c', 12);
  addFloater(tower.x, tower.y - 20, `+${value} 🪙`, '#8a6000');
  showToast(`Tower sold for ${value} coins`);
  playTone(260, .12, 'triangle', .025);
  updateUI();
}

function placeTower(point) {
  if (state.gameOver || state.countdownActive) return;
  if (!selectedTower) {
    showToast('Choose a defender or basket first');
    return;
  }
  const type = TOWER_TYPES[selectedTower];
  if (!canPlaceDefense(point, selectedTower)) {
    showToast(type.trap ? 'Basket traps must go on a clear part of the road 🧺' : 'That spot needs more room 🌿', true);
    playTone(150, 0.08, 'square', 0.025);
    return;
  }
  if (state.coins < type.cost) {
    showToast(`Need ${type.cost - state.coins} more coins 🪙`, true);
    playTone(140, 0.11, 'sawtooth', 0.02);
    return;
  }
  state.coins -= type.cost;
  const placement = type.trap ? nearestPointOnPath(point) : point;
  const tower = {
    x: placement.x, y: placement.y, type: selectedTower, cooldown: 0,
    bob: Math.random() * Math.PI * 2, level: 1, invested: type.cost
  };
  state.towers.push(tower);
  state.selectedPlaced = tower;
  clearPlacementSelection();
  burst(placement.x, placement.y, type.color, 10);
  addFloater(placement.x, placement.y - 30, `-${type.cost} 🪙`, '#7c5290');
  showToast(`${type.name} reporting for duty!`);
  playChord([280, 420, 560], 0.08);
  updateUI();
}

function startWave() {
  if (state.waveActive || state.gameOver || state.countdownActive) return;
  els.welcomeCard.hidden = true;
  state.autoStartCountdown = 0;
  state.countdownActive = true;
  els.countdown.hidden = false;
  let count = 3;
  els.countdown.textContent = count;
  playTone(420, .08, 'sine', .035);
  const timer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      els.countdown.textContent = count;
      playTone(420 + (3 - count) * 80, .08, 'sine', .035);
    } else {
      clearInterval(timer);
      els.countdown.hidden = true;
      state.countdownActive = false;
      beginWave();
    }
  }, 460);
  updateUI();
}

function beginWave() {
  state.wave += 1;
  const isBoss = state.wave % 5 === 0;
  const regularCount = 7 + state.wave * 2;
  state.spawnQueue = [];
  for (let i = 0; i < regularCount; i++) {
    const kind = state.wave >= 3 && i % 6 === 4 ? 'swift' : state.wave >= 7 && i % 8 === 6 ? 'tanky' : 'regular';
    state.spawnQueue.push(kind);
  }
  if (isBoss) state.spawnQueue.push('boss');
  state.totalThisWave = state.spawnQueue.length;
  state.defeatedThisWave = 0;
  state.waveActive = true;
  state.spawning = true;
  state.spawnTimer = 0;
  state.portalPulse = isBoss ? 2.2 : 1.35;
  state.portalLabelUntil = state.elapsed + 2.2;
  state.portalBossUntil = isBoss ? state.elapsed + 4.5 : 0;
  els.bossAlert.hidden = !isBoss;
  showToast(isBoss ? '👑 The alpha cheetah is approaching!' : `Cheetah wave ${state.wave} incoming!`);
  playChord(isBoss ? [150, 120, 90] : [320, 440, 640], .18);
  updateUI();
}

function spawnEnemy(kind) {
  const baseHp = 35 + state.wave * 11 + Math.pow(state.wave, 1.32) * 2;
  const configs = {
    regular: { hp: baseHp, speed: 66 + Math.min(state.wave * 1.5, 24), reward: 10, size: 28 },
    swift: { hp: baseHp * .66, speed: 112 + state.wave, reward: 13, size: 25 },
    tanky: { hp: baseHp * 2.25, speed: 49 + state.wave, reward: 20, size: 33 },
    boss: { hp: baseHp * (8 + state.wave * .3), speed: 37 + state.wave * .4, reward: 110 + state.wave * 4, size: 53 }
  };
  const config = configs[kind];
  state.portalPulse = Math.max(state.portalPulse, kind === 'boss' ? 2.4 : .85);
  burst(34, 130, kind === 'boss' ? '#ff667d' : '#8ce9ff', kind === 'boss' ? 22 : 8);
  state.enemies.push({
    kind, hp: config.hp, maxHp: config.hp, baseSpeed: config.speed, reward: config.reward, size: config.size,
    segment: 0, segmentT: 0, x: path[0].x, y: path[0].y, slowUntil: 0,
    slowFactor: 1, trappedUntil: 0, dead: false, rotation: 0, direction: 1,
    runPhase: Math.random() * Math.PI * 2, progress: 0, hitFlash: 0
  });
}

function update(dt) {
  if (state.paused || state.gameOver || state.countdownActive) return;
  state.elapsed += dt;
  state.portalPulse = Math.max(0, state.portalPulse - dt * 2.2);
  state.palaceHit = Math.max(0, state.palaceHit - dt * 1.8);

  if (!state.waveActive && state.autoStart && state.autoStartCountdown > 0) {
    state.autoStartCountdown -= dt;
    if (state.autoStartCountdown <= 0) startWave();
  }

  if (state.spawning) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.spawnQueue.length) {
      const kind = state.spawnQueue.shift();
      spawnEnemy(kind);
      state.spawnTimer = kind === 'boss' ? 1.0 : Math.max(.34, .72 - state.wave * .012);
    }
    if (!state.spawnQueue.length) state.spawning = false;
  }

  updateEnemies(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateParticles(dt);

  if (state.waveActive && !state.spawning && !state.enemies.length) finishWave();
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    const factor = state.elapsed < enemy.trappedUntil ? .04 : state.elapsed < enemy.slowUntil ? enemy.slowFactor : 1;
    let travel = enemy.baseSpeed * factor * dt;
    while (travel > 0 && enemy.segment < path.length - 1) {
      const a = path[enemy.segment];
      const b = path[enemy.segment + 1];
      const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
      const remaining = segmentLength * (1 - enemy.segmentT);
      if (travel >= remaining) {
        travel -= remaining;
        enemy.segment += 1;
        enemy.segmentT = 0;
      } else {
        enemy.segmentT += travel / segmentLength;
        travel = 0;
      }
    }
    if (enemy.segment >= path.length - 1) {
      enemy.dead = true;
      const damage = enemy.kind === 'boss' ? 5 : enemy.kind === 'tanky' ? 2 : 1;
      state.lives = Math.max(0, state.lives - damage);
      state.palaceHit = 1;
      addFloater(BASE_W - 88, 405, `SNACK STOLEN! -${damage} ❤️`, '#d73974');
      burst(BASE_W - 55, 492, '#ff79b1', 14);
      burst(BASE_W - 80, 472, '#ffd15c', 9);
      playTone(105, .25, 'sawtooth', .045);
      if (state.lives <= 0) endGame();
      continue;
    }
    const a = path[enemy.segment];
    const b = path[enemy.segment + 1];
    enemy.x = a.x + (b.x - a.x) * enemy.segmentT;
    enemy.y = a.y + (b.y - a.y) * enemy.segmentT;
    enemy.direction = b.x >= a.x ? 1 : -1;
    enemy.rotation = Math.atan2(b.y - a.y, b.x - a.x) * .06;
    enemy.progress = (enemy.segment + enemy.segmentT) / (path.length - 1);
  }
  state.enemies = state.enemies.filter((e) => !e.dead);
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    if (tower === draggingTower) continue;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const type = TOWER_TYPES[tower.type];
    const stats = getTowerStats(tower);
    if (type.trap) {
      const trigger = state.enemies.find((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= 31);
      if (trigger) {
        const trapped = state.enemies.filter((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
        trapped.forEach((enemy) => { enemy.trappedUntil = Math.max(enemy.trappedUntil, state.elapsed + stats.trapTime); });
        tower.cooldown = stats.cooldown;
        burst(tower.x, tower.y, '#e2a552', 15);
        addFloater(tower.x, tower.y - 25, `SNARED ×${trapped.length}`, '#8b4e1c');
        showToast(`🧺 Basket snared ${trapped.length} cheetah${trapped.length === 1 ? '' : 's'}!`);
        playChord([180, 145], .1);
      }
      continue;
    }
    let target = null;
    let bestProgress = -1;
    for (const enemy of state.enemies) {
      const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
      if (dist <= stats.range && enemy.progress > bestProgress) {
        target = enemy;
        bestProgress = enemy.progress;
      }
    }
    if (target) {
      tower.cooldown = stats.cooldown;
      state.projectiles.push({
        x: tower.x, y: tower.y - 10, target, type: tower.type, speed: tower.type === 'melon' ? 320 : 440,
        emoji: type.projectile, size: tower.type === 'melon' ? 18 : 13, dead: false, trail: [],
        damage: stats.damage, splash: stats.splash, slowTime: stats.slowTime
      });
      if (tower.type === 'melon') playTone(170, .05, 'triangle', .012);
      else if (Math.random() < .35) playTone(tower.type === 'chill' ? 650 : 430, .035, 'sine', .008);
    }
  }
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    if (projectile.dead || projectile.target.dead || !state.enemies.includes(projectile.target)) {
      projectile.dead = true;
      continue;
    }
    projectile.trail.push({ x: projectile.x, y: projectile.y, life: .18 });
    if (projectile.trail.length > 5) projectile.trail.shift();
    const dx = projectile.target.x - projectile.x;
    const dy = projectile.target.y - projectile.y;
    const dist = Math.hypot(dx, dy);
    const step = projectile.speed * dt;
    if (dist <= step + projectile.target.size * .25) {
      hitEnemy(projectile.target, projectile);
      projectile.dead = true;
    } else {
      projectile.x += dx / dist * step;
      projectile.y += dy / dist * step;
    }
  }
  state.projectiles = state.projectiles.filter((p) => !p.dead);
}

function hitEnemy(enemy, projectile) {
  const type = TOWER_TYPES[projectile.type];
  const targets = projectile.splash
    ? state.enemies.filter((other) => Math.hypot(other.x - enemy.x, other.y - enemy.y) <= projectile.splash)
    : [enemy];
  for (const target of targets) {
    const damage = projectile.splash && target !== enemy ? projectile.damage * .65 : projectile.damage;
    target.hp -= damage;
    target.hitFlash = .09;
    if (type.slow) {
      target.slowFactor = 1 - type.slow;
      target.slowUntil = state.elapsed + projectile.slowTime;
    }
    if (target.hp <= 0 && !target.dead) defeatEnemy(target);
  }
  burst(enemy.x, enemy.y, type.color, type.splash ? 12 : 5);
  if (projectile.splash) {
    state.particles.push({ x: enemy.x, y: enemy.y, radius: 8, maxRadius: projectile.splash, life: .25, maxLife: .25, ring: true, color: type.color });
    playTone(110, .12, 'triangle', .02);
  }
}

function defeatEnemy(enemy) {
  enemy.dead = true;
  state.coins += enemy.reward;
  state.defeatedThisWave += 1;
  addFloater(enemy.x, enemy.y - 26, `+${enemy.reward} 🪙`, '#8a6000');
  burst(enemy.x, enemy.y, enemy.kind === 'boss' ? '#ffd75e' : '#ff9cc9', enemy.kind === 'boss' ? 28 : 10);
  if (enemy.kind === 'boss') {
    showToast('👑 Alpha cheetah stopped! Safari bonus collected!');
    playChord([260, 390, 520, 780], .24);
  }
}

function finishWave() {
  state.waveActive = false;
  const bonus = 16 + state.wave * 2;
  state.coins += bonus;
  els.bossAlert.hidden = true;
  addFloater(BASE_W / 2, 55, `Wave bonus +${bonus} 🪙`, '#5a338f');
  state.celebrationUntil = state.elapsed + 1.8;
  const partyColors = ['#ff5e91', '#ffd957', '#57c9f5', '#55d6a8', '#7c4dff', '#ff765f'];
  for (let i = 0; i < 48; i++) {
    state.particles.push({
      x: 160 + Math.random() * 680, y: -10 - Math.random() * 80,
      vx: -24 + Math.random() * 48, vy: 85 + Math.random() * 100,
      life: 1.45 + Math.random() * .55, maxLife: 2, size: 4 + Math.random() * 5,
      color: partyColors[i % partyColors.length], ring: false, shape: 'confetti',
      rotation: Math.random() * Math.PI, spin: -7 + Math.random() * 14
    });
  }
  showToast(`Wave ${state.wave} cleared! Snack Palace secured ✨`);
  playChord([380, 480, 620, 760], .15);
  if (state.autoStart) state.autoStartCountdown = 3;
  updateUI();
}

function toggleAutoStart() {
  state.autoStart = !state.autoStart;
  state.autoStartCountdown = state.autoStart && !state.waveActive && !state.countdownActive ? 3 : 0;
  showToast(state.autoStart ? 'Auto-start armed: next wave in 3 seconds' : 'Auto-start turned off');
  playTone(state.autoStart ? 560 : 260, .09, 'sine', .02);
  updateUI();
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = 25 + Math.random() * 80;
    state.particles.push({
      x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force - 22,
      life: .35 + Math.random() * .4, maxLife: .75, size: 2 + Math.random() * 4, color, ring: false
    });
  }
}

function addFloater(x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    if (!p.ring) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      if (p.shape === 'confetti') p.rotation += p.spin * dt;
    }
  }
  for (const f of state.floaters) {
    f.life -= dt;
    f.y -= 25 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  state.floaters = state.floaters.filter((f) => f.life > 0);
}

function endGame() {
  state.gameOver = true;
  state.waveActive = false;
  state.autoStartCountdown = 0;
  els.endTitle.textContent = 'The snacks got pounced!';
  els.endText.textContent = `Your capy crew held the trail through ${state.wave} wave${state.wave === 1 ? '' : 's'}.`;
  els.endEmoji.textContent = state.wave >= 10 ? '🏅' : '🌧️';
  els.endCard.hidden = false;
  playChord([240, 195, 150, 105], .3);
  updateUI();
}

function updateTowerInspector() {
  const tower = state.selectedPlaced;
  const visible = tower && state.towers.includes(tower) && !state.gameOver;
  els.towerInspector.hidden = !visible;
  if (!visible) return;

  const type = TOWER_TYPES[tower.type];
  const stats = getTowerStats(tower);
  const upgradeCost = getUpgradeCost(tower);
  const maxed = tower.level >= MAX_TOWER_LEVEL;

  els.inspectorImage.hidden = Boolean(type.trap);
  els.inspectorEmoji.hidden = !type.trap;
  if (!type.trap && els.inspectorImage.getAttribute('src') !== SPRITE_SOURCES[tower.type]) {
    els.inspectorImage.src = SPRITE_SOURCES[tower.type];
  }
  els.inspectorLevel.textContent = `LEVEL ${tower.level} / ${MAX_TOWER_LEVEL}`;
  els.inspectorName.textContent = type.name;
  els.inspectorDamageLabel.textContent = type.trap ? 'Hold' : 'Damage';
  els.inspectorRangeLabel.textContent = type.trap ? 'Radius' : 'Range';
  els.inspectorSpeedLabel.textContent = type.trap ? 'Reset' : 'Speed';
  els.inspectorDamage.textContent = type.trap ? `${stats.trapTime.toFixed(1)}s` : Math.round(stats.damage);
  els.inspectorRange.textContent = Math.round(stats.range);
  els.inspectorSpeed.textContent = type.trap ? `${stats.cooldown.toFixed(1)}s` : `${(1 / stats.cooldown).toFixed(1)}/s`;
  els.upgradeTowerBtn.textContent = maxed ? '★ MAX LEVEL' : `Upgrade · 🪙 ${upgradeCost}`;
  els.upgradeTowerBtn.disabled = maxed || state.coins < upgradeCost;
  els.sellTowerBtn.textContent = `Sell · 🪙 ${getSellValue(tower)}`;
}

function updateUI() {
  els.coins.textContent = Math.floor(state.coins);
  els.lives.textContent = state.lives;
  els.wave.textContent = state.wave;
  els.pauseBtn.textContent = state.paused ? '▶' : '⏸';
  els.speedBtn.textContent = `${speed}×`;
  els.autoStartBtn.textContent = state.autoStart ? 'Auto on' : 'Auto off';
  els.autoStartBtn.classList.toggle('active', state.autoStart);
  els.autoStartBtn.setAttribute('aria-pressed', String(state.autoStart));
  canvas.classList.toggle('placing', Boolean(selectedTower));

  const remaining = state.enemies.length + state.spawnQueue.length;
  const progress = state.totalThisWave ? (state.totalThisWave - remaining) / state.totalThisWave * 100 : 0;
  els.waveProgress.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  els.enemyCount.textContent = `${state.enemies.length} cheetah${state.enemies.length === 1 ? '' : 's'} on trail`;

  if (state.gameOver) {
    els.waveStatus.textContent = 'SNACK PALACE OVERRUN';
    els.waveDescription.textContent = 'The capy crew needs a rematch';
    els.waveIcon.textContent = '🌧️';
  } else if (state.paused) {
    els.waveStatus.textContent = 'TIMEOUT';
    els.waveDescription.textContent = 'Everyone is taking a tiny breather';
    els.waveIcon.textContent = '⏸️';
  } else if (state.waveActive) {
    els.waveStatus.textContent = state.wave % 5 === 0 ? 'BOSS WAVE IN PROGRESS' : `WAVE ${state.wave} IN PROGRESS`;
    els.waveDescription.textContent = state.wave % 5 === 0 ? 'Stop the crowned alpha cheetah!' : 'Spotted sprinters on the trail';
    els.waveIcon.textContent = state.wave % 5 === 0 ? '👑' : '🐆';
  } else if (state.autoStartCountdown > 0) {
    els.waveStatus.textContent = 'AUTO-START ARMED';
    els.waveDescription.textContent = `Wave ${state.wave + 1} begins in ${Math.ceil(state.autoStartCountdown)}s`;
    els.waveIcon.textContent = '⏱️';
  } else {
    els.waveStatus.textContent = state.wave === 0 ? 'SAVANNA IS QUIET' : 'WAVE CLEARED';
    els.waveDescription.textContent = state.wave === 0 ? 'Build your first line of defense' : `Next: wave ${state.wave + 1}${(state.wave + 1) % 5 === 0 ? ' — boss incoming!' : ''}`;
    els.waveIcon.textContent = state.wave === 0 ? '🌱' : '✨';
  }

  const buttonLabel = els.startWaveBtn.querySelector('span');
  const topButtonLabel = els.topStartWaveBtn.querySelector('span');
  const waveButtonText = state.waveActive
    ? `Wave ${state.wave} running`
    : state.countdownActive
      ? 'Get ready…'
      : state.autoStartCountdown > 0
        ? `Start now · ${Math.ceil(state.autoStartCountdown)}s`
        : `Start wave ${state.wave + 1}`;
  buttonLabel.textContent = waveButtonText;
  topButtonLabel.textContent = waveButtonText;
  const waveButtonDisabled = state.waveActive || state.countdownActive || state.gameOver;
  els.startWaveBtn.disabled = waveButtonDisabled;
  els.topStartWaveBtn.disabled = waveButtonDisabled;

  document.querySelectorAll('.tower-card').forEach((card) => {
    card.classList.toggle('unaffordable', state.coins < TOWER_TYPES[card.dataset.tower].cost);
  });
  updateTowerInspector();
}

function showToast(message, bad = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('bad', bad);
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function playTone(freq, duration, type = 'sine', volume = .025) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch (_) { /* Audio is a bonus; the game remains fully playable without it. */ }
}

function playChord(freqs, duration) {
  freqs.forEach((freq, i) => setTimeout(() => playTone(freq, duration, 'sine', .018), i * 45));
}

function draw() {
  ctx.clearRect(0, 0, BASE_W, BASE_H);
  drawMeadow();
  drawPath();
  drawPortal();
  drawSnackPalace();
  drawDecor();
  drawAmbientFriends();
  drawTowers();
  drawProjectiles();
  drawEnemies();
  drawEffects();
  drawPlacementPreview();
}

function drawMeadow() {
  const gradient = ctx.createLinearGradient(0, 0, 0, BASE_H);
  gradient.addColorStop(0, '#d9e79a');
  gradient.addColorStop(1, '#a6cd7e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Layered storybook hills make the board feel like a playful illustrated world.
  ctx.fillStyle = 'rgba(255,239,132,.22)';
  ctx.beginPath();
  ctx.ellipse(185, 26, 235, 80, 0, 0, Math.PI * 2);
  ctx.ellipse(610, 2, 310, 88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(73,166,103,.13)';
  ctx.beginPath();
  ctx.ellipse(185, 610, 270, 100, 0, 0, Math.PI * 2);
  ctx.ellipse(730, 625, 350, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = .16;
  for (let x = 10; x < BASE_W; x += 42) {
    for (let y = 12; y < BASE_H; y += 38) {
      const n = Math.sin(x * 1.73 + y * 2.17) * 9;
      ctx.fillStyle = (x + y) % 3 ? '#6b9c52' : '#fff0a1';
      ctx.beginPath();
      ctx.arc(x + n, y + n * .45, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Pond near the capybara stronghold.
  ctx.fillStyle = '#74cfd0';
  ctx.beginPath();
  ctx.ellipse(860, 95, 74, 34, -.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(840, 92, 28, Math.PI * 1.1, Math.PI * 1.8);
  ctx.stroke();

}

function drawPath() {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(78, 77, 104, .14)';
  ctx.lineWidth = 90;
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = '#e7c27e';
  ctx.lineWidth = 80;
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.36)';
  ctx.lineWidth = 4;
  ctx.setLineDash([3, 18]);
  tracePath();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '15px serif';
  ctx.globalAlpha = .45;
  for (let i = 1; i < path.length - 2; i += 2) {
    const a = path[i];
    const b = path[i + 1];
    ctx.fillText('🐾', (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.globalAlpha = 1;
}

function tracePath() {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
}

function drawPortal() {
  const pulse = state.portalPulse || 0;
  const bossMode = state.elapsed < state.portalBossUntil;
  const x = 35;
  const y = 130;
  ctx.save();
  ctx.translate(x, y);

  const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 61 + pulse * 8);
  glow.addColorStop(0, bossMode ? 'rgba(255,70,95,.9)' : 'rgba(55,27,105,.96)');
  glow.addColorStop(.45, bossMode ? 'rgba(255,150,55,.5)' : 'rgba(113,88,255,.45)');
  glow.addColorStop(1, 'rgba(70,40,120,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 66 + pulse * 6, 83 + pulse * 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bossMode ? '#3d1026' : '#28194e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 28 + pulse * 2, 52 + pulse * 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const colors = bossMode ? ['#ff435f', '#ff9c3f', '#ffd65a'] : ['#ff77b7', '#ffca5c', '#72df91', '#6ed6ff'];
  ctx.lineCap = 'round';
  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.globalAlpha = .82;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34 + index * 5 + pulse * 2, 58 + index * 4 + pulse * 3, 0,
      state.elapsed * (index % 2 ? -.9 : .8) + index,
      state.elapsed * (index % 2 ? -.9 : .8) + index + Math.PI * 1.2);
    ctx.stroke();
  });

  if (spriteReady('portal')) {
    const portalScale = 1 + pulse * .035;
    ctx.globalAlpha = 1;
    ctx.drawImage(SPRITES.portal, -64 * portalScale, -80 * portalScale, 128 * portalScale, 160 * portalScale);
  }

  ctx.globalAlpha = .75;
  ctx.font = `${15 + pulse * 2}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) {
    const angle = state.elapsed * .9 + i * Math.PI / 2;
    ctx.fillText('🐾', Math.cos(angle) * 48, Math.sin(angle) * 65);
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  roundRect(5, 41, 124, 26, 13, 'rgba(50,30,79,.9)');
  ctx.fillStyle = '#fff6d7';
  ctx.font = '900 11px Nunito';
  ctx.fillText(bossMode ? '⚠ ALPHA PORTAL' : 'RAINBOW PORTAL', 14, 55);
  if (state.elapsed < state.portalLabelUntil) {
    roundRect(9, 87, 85, 28, 14, bossMode ? '#e94a66' : '#7257c9');
    ctx.fillStyle = '#fff';
    ctx.font = '900 13px Nunito';
    ctx.fillText(`WAVE ${state.wave}`, 22, 101);
  }
  ctx.restore();
}

function drawSnackPalace() {
  const hit = state.palaceHit || 0;
  const shake = hit ? Math.sin(state.elapsed * 70) * 7 * hit : 0;
  const x = 925 + shake;
  const y = 482;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(56,45,66,.2)';
  ctx.beginPath();
  ctx.ellipse(0, 66, 78, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (spriteReady('palace')) {
    ctx.globalAlpha = hit ? .75 + Math.sin(state.elapsed * 45) * .2 : 1;
    ctx.drawImage(SPRITES.palace, -88, -92, 176, 176);
    ctx.globalAlpha = 1;
  } else {
    roundRect(-58, -48, 116, 110, 18, '#ffb66f');
  }

  roundRect(-60, -93, 120, 24, 12, '#6040b8');
  ctx.fillStyle = '#fff7c8';
  ctx.font = '900 10px Nunito';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍪 SNACK PALACE 🍊', 0, -81);

  // Remaining supplies visually shrink as lives are lost.
  const baskets = Math.max(0, Math.ceil(state.lives / 4));
  ctx.font = '16px serif';
  for (let i = 0; i < baskets; i++) ctx.fillText('🧺', -32 + i * 16, 63);

  if (hit > 0) {
    ctx.globalAlpha = hit;
    ctx.font = '18px serif';
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + state.elapsed * 2;
      ctx.fillText(i % 2 ? '✨' : '🍪', Math.cos(angle) * (68 + (1 - hit) * 25), Math.sin(angle) * 55);
    }
  }
  ctx.restore();
}

function drawDecor() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [emoji, x, y, size] of decor) {
    ctx.font = `${size}px serif`;
    ctx.globalAlpha = emoji === '🌳' || emoji === '🌲' ? .92 : .78;
    ctx.fillText(emoji, x, y);
  }
  ctx.globalAlpha = 1;
}

function drawAmbientFriends() {
  const butterflies = [
    { x: 245, y: 63, color: '#ff5e91', phase: 0 },
    { x: 742, y: 175, color: '#7c4dff', phase: 2.1 },
    { x: 145, y: 395, color: '#57c9f5', phase: 4.3 }
  ];
  for (const butterfly of butterflies) {
    const bob = Math.sin(state.elapsed * 2 + butterfly.phase) * 5;
    const flap = 4 + Math.abs(Math.sin(state.elapsed * 7 + butterfly.phase)) * 5;
    ctx.save();
    ctx.translate(butterfly.x, butterfly.y + bob);
    ctx.fillStyle = butterfly.color;
    ctx.strokeStyle = 'rgba(48,32,94,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-flap, 0, flap, 6, -.35, 0, Math.PI * 2);
    ctx.ellipse(flap, 0, flap, 6, .35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#30205e';
    ctx.beginPath();
    ctx.ellipse(0, 1, 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTowers() {
  for (const tower of state.towers) {
    const type = TOWER_TYPES[tower.type];
    const stats = getTowerStats(tower);
    const bob = Math.sin(state.elapsed * 2.4 + tower.bob) * 2;
    if (state.selectedPlaced === tower) {
      const dragIsValid = tower !== draggingTower || canPlaceDefense({ x: tower.x, y: tower.y }, tower.type, tower);
      const selectionColor = dragIsValid ? type.color : '#e33f5f';
      ctx.fillStyle = `${selectionColor}1d`;
      ctx.strokeStyle = `${selectionColor}80`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (tower === draggingTower && dragMoved) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = dragIsValid ? '#5fbd75' : '#e33f5f';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 33, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(52,54,71,.16)';
    ctx.beginPath();
    ctx.ellipse(tower.x, tower.y + 22, 30, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    if (type.trap) {
      ctx.save();
      ctx.globalAlpha = tower.cooldown > 0 ? .62 : 1;
      ctx.font = '38px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧺', tower.x, tower.y - 2 + bob);
      ctx.restore();
      if (tower.cooldown > 0) {
        const recharge = Math.max(.001, stats.cooldown);
        const progress = 1 - Math.min(1, tower.cooldown / recharge);
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }
    } else if (spriteReady(tower.type)) {
      const spriteSize = tower.type === 'melon' ? 88 : tower.type === 'chill' ? 78 : 74;
      ctx.drawImage(SPRITES[tower.type], tower.x - spriteSize / 2, tower.y - spriteSize / 2 - 5 + bob, spriteSize, spriteSize);
    } else {
      ctx.fillStyle = '#fff8d9';
      ctx.strokeStyle = '#8b68c2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y + 5, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${tower.type === 'slinger' ? 37 : 34}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type.emoji, tower.x, tower.y - 4 + bob);
    }
    if (tower.level > 1) {
      ctx.font = '900 12px Nunito';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(91,52,13,.75)';
      ctx.fillStyle = '#ffd347';
      const stars = '★'.repeat(tower.level - 1);
      ctx.strokeText(stars, tower.x, tower.y + 30);
      ctx.fillText(stars, tower.x, tower.y + 30);
    }
  }
}

function drawEnemies() {
  const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
  for (const enemy of sorted) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation);
    ctx.fillStyle = 'rgba(70,50,96,.2)';
    ctx.beginPath();
    ctx.ellipse(0, enemy.size * .42, enemy.size * .72, enemy.size * .22, 0, 0, Math.PI * 2);
    ctx.fill();
    if (spriteReady(enemy.kind)) {
      const spriteSize = enemy.kind === 'boss' ? enemy.size * 2.85 : enemy.size * 2.7;
      const bob = Math.sin(state.elapsed * (enemy.kind === 'swift' ? 14 : 9) + enemy.runPhase) * 1.4;
      ctx.save();
      const hit = Math.max(0, enemy.hitFlash / .09);
      ctx.scale(1 + hit * .18, 1 - hit * .13);
      ctx.scale(enemy.direction || 1, 1);
      ctx.drawImage(SPRITES[enemy.kind], -spriteSize / 2, -spriteSize / 2 + bob, spriteSize, spriteSize);
      ctx.restore();
    } else {
      drawCheetah(enemy);
    }
    if (state.elapsed < enemy.trappedUntil) {
      ctx.strokeStyle = '#9a5b25';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, enemy.size * .28, enemy.size * .58, enemy.size * .24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `${Math.max(14, enemy.size * .55)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', -enemy.size * .56, -enemy.size * .54);
      ctx.fillText('✨', enemy.size * .56, -enemy.size * .48);
      ctx.beginPath();
      ctx.moveTo(-enemy.size * .42, enemy.size * .12);
      ctx.lineTo(enemy.size * .42, enemy.size * .42);
      ctx.moveTo(enemy.size * .42, enemy.size * .12);
      ctx.lineTo(-enemy.size * .42, enemy.size * .42);
      ctx.stroke();
    }
    ctx.restore();

    const w = enemy.kind === 'boss' ? 70 : 42;
    const barY = enemy.y - enemy.size * .72 - (enemy.kind === 'boss' ? 15 : 0);
    roundRect(enemy.x - w / 2, barY, w, 7, 4, 'rgba(48,31,72,.35)');
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    roundRect(enemy.x - w / 2 + 1.5, barY + 1.5, (w - 3) * ratio, 4, 2, ratio > .5 ? '#6fcd78' : ratio > .25 ? '#ffc857' : '#f05c82');
  }
}

function drawCheetah(enemy) {
  const scale = enemy.size / 28;
  const runSpeed = enemy.kind === 'swift' ? 20 : enemy.kind === 'boss' ? 10 : 14;
  const run = Math.sin(state.elapsed * runSpeed + enemy.runPhase);
  const stride = run * 5;
  const gold = '#f2ad2f';
  const goldLight = '#ffd36a';
  const dark = '#392619';

  ctx.save();
  ctx.scale(enemy.direction || 1, 1);
  ctx.scale(scale, scale);

  // Swift cheetahs kick up clean speed streaks instead of flickering emoji glyphs.
  if (enemy.kind === 'swift') {
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    [-7, 0, 7].forEach((y, i) => {
      ctx.beginPath();
      ctx.moveTo(-22 - i * 3, y);
      ctx.lineTo(-34 - i * 5, y + 1);
      ctx.stroke();
    });
  }

  // Curved tail with a dark tip.
  ctx.lineCap = 'round';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-15, -4);
  ctx.quadraticCurveTo(-30, -14, -25, -24);
  ctx.stroke();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-15, -4);
  ctx.quadraticCurveTo(-30, -14, -25, -24);
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-26, -21);
  ctx.lineTo(-25, -24);
  ctx.stroke();

  // Running legs. Each pair moves in opposition so the animal reads as a sprinting cheetah.
  const legs = [
    { x: -9, bend: stride }, { x: -3, bend: -stride },
    { x: 8, bend: -stride }, { x: 13, bend: stride }
  ];
  for (const leg of legs) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(leg.x, 3);
    ctx.lineTo(leg.x + leg.bend * .55, 12);
    ctx.lineTo(leg.x + leg.bend, 17);
    ctx.stroke();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leg.x, 3);
    ctx.lineTo(leg.x + leg.bend * .55, 12);
    ctx.lineTo(leg.x + leg.bend, 17);
    ctx.stroke();
  }

  // Golden body with a high-contrast outline and pale belly, distinct from the dusty road.
  ctx.fillStyle = gold;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, -3, 19, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = goldLight;
  ctx.beginPath();
  ctx.ellipse(2, 1, 13, 4, 0, 0, Math.PI);
  ctx.fill();

  // Red raider scarf makes their invading role immediately clear.
  ctx.fillStyle = '#d94b3f';
  ctx.beginPath();
  ctx.moveTo(10, -10);
  ctx.lineTo(3, -16);
  ctx.lineTo(13, -13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9f2e28';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -12);
  ctx.lineTo(14, -4);
  ctx.stroke();

  // Head, ears, muzzle, eyes, and the classic cheetah tear marks.
  ctx.fillStyle = gold;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(16, -9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(11, -16, 3.2, 0, Math.PI * 2);
  ctx.arc(20, -17, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe0a0';
  ctx.beginPath();
  ctx.ellipse(21, -6, 6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(24, -7, 1.7, 0, Math.PI * 2);
  ctx.arc(18, -11, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(18, -10);
  ctx.lineTo(20, -5);
  ctx.stroke();

  // Stable, hand-drawn spots—no platform emoji rendering, so no frame flicker.
  ctx.fillStyle = dark;
  [[-12,-6,2],[-7,-1,1.6],[-3,-7,1.7],[2,-2,1.8],[6,-7,1.5],[10,-1,1.5],[13,-11,1.3]].forEach(([x,y,r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  if (enemy.kind === 'tanky') {
    ctx.fillStyle = '#5b86bd';
    ctx.strokeStyle = '#d9efff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(7, -10);
    ctx.lineTo(6, -1);
    ctx.quadraticCurveTo(2, 5, -2, 7);
    ctx.quadraticCurveTo(-6, 5, -7, -1);
    ctx.lineTo(-7, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (enemy.kind === 'boss') {
    ctx.fillStyle = '#ffd347';
    ctx.strokeStyle = '#8a5413';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, -22);
    ctx.lineTo(10, -30);
    ctx.lineTo(15, -24);
    ctx.lineTo(20, -31);
    ctx.lineTo(23, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (state.elapsed < enemy.slowUntil) {
    ctx.strokeStyle = '#d9f6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 1, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    ctx.globalAlpha = .25;
    for (const point of projectile.trail) {
      ctx.fillStyle = TOWER_TYPES[projectile.type].color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = `${projectile.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(projectile.emoji, projectile.x, projectile.y);
  }
}

function drawEffects() {
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    if (p.ring) {
      const progress = 1 - p.life / p.maxLife;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + (p.maxRadius - p.radius) * progress, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'confetti') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * .35, p.size * 2, p.size * .7);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  if (state.elapsed < state.celebrationUntil) {
    const left = state.celebrationUntil - state.elapsed;
    const bounce = 1 + Math.sin((1.8 - left) * 8) * Math.min(.08, left * .05);
    ctx.save();
    ctx.translate(BASE_W / 2, 92);
    ctx.scale(bounce, bounce);
    roundRect(-122, -28, 244, 56, 22, 'rgba(81,48,182,.94)');
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#fff7c8';
    ctx.font = '900 23px Baloo 2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ PALACE SAVED! ✨', 0, 1);
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.font = '900 14px Nunito';
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawPlacementPreview() {
  if (!selectedTower || !hoverPoint || state.gameOver || state.countdownActive || state.selectedPlaced) return;
  const type = TOWER_TYPES[selectedTower];
  const snapped = type.trap ? nearestPointOnPath(hoverPoint) : hoverPoint;
  const previewPoint = type.trap ? { x: snapped.x, y: snapped.y } : hoverPoint;
  const valid = canPlaceDefense(hoverPoint, selectedTower) && state.coins >= type.cost;
  const previewRange = type.trap ? type.radius : type.range;
  ctx.globalAlpha = .22;
  ctx.fillStyle = valid ? type.color : '#ef406a';
  ctx.beginPath();
  ctx.arc(previewPoint.x, previewPoint.y, previewRange, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .72;
  ctx.font = '36px serif';
  ctx.fillText(type.emoji, previewPoint.x, previewPoint.y);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = valid ? '#fff' : '#db285a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(previewPoint.x, previewPoint.y, 29, 0, Math.PI * 2);
  ctx.stroke();
}

function roundRect(x, y, w, h, r, fill) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  ctx.fill();
}

function loop(now) {
  const rawDt = Math.min(.045, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(rawDt * speed);
  updateUI();
  draw();
  requestAnimationFrame(loop);
}

document.querySelectorAll('.tower-card').forEach((card) => {
  card.addEventListener('click', () => selectTower(card.dataset.tower));
});

canvas.addEventListener('pointermove', (event) => {
  const point = toGamePoint(event);
  hoverPoint = point;
  if (draggingTower && event.pointerId === dragPointerId) moveTowerDrag(point);
});
canvas.addEventListener('pointerleave', () => {
  if (!draggingTower) hoverPoint = null;
});
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  els.welcomeCard.hidden = true;
  const point = toGamePoint(event);
  const existingTower = towerAtPoint(point);
  if (existingTower) {
    beginTowerDrag(existingTower, point, event.pointerId);
    hoverPoint = null;
    playTone(420, .04, 'sine', .012);
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is a progressive enhancement. */ }
    return;
  }
  placeTower(point);
});
canvas.addEventListener('pointerup', (event) => {
  if (!draggingTower || event.pointerId !== dragPointerId) return;
  try { canvas.releasePointerCapture(event.pointerId); } catch (_) { /* Safe when capture was unavailable. */ }
  finishTowerDrag(false);
});
canvas.addEventListener('pointercancel', (event) => {
  if (!draggingTower || event.pointerId !== dragPointerId) return;
  finishTowerDrag(true);
});
window.addEventListener('pointermove', (event) => {
  if (!draggingTower || event.pointerId !== dragPointerId || event.target === canvas) return;
  const point = toGamePoint(event);
  hoverPoint = point;
  moveTowerDrag(point);
});
window.addEventListener('pointerup', (event) => {
  if (!draggingTower || event.pointerId !== dragPointerId) return;
  finishTowerDrag(false);
});
window.addEventListener('pointercancel', (event) => {
  if (!draggingTower || event.pointerId !== dragPointerId) return;
  finishTowerDrag(true);
});

els.startWaveBtn.addEventListener('click', startWave);
els.topStartWaveBtn.addEventListener('click', startWave);
els.pauseBtn.addEventListener('click', () => {
  if (state.gameOver) return;
  state.paused = !state.paused;
  updateUI();
});
els.speedBtn.addEventListener('click', () => {
  speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  updateUI();
  showToast(`Game speed: ${speed}×`);
});
els.autoStartBtn.addEventListener('click', toggleAutoStart);
els.upgradeTowerBtn.addEventListener('click', upgradeSelectedTower);
els.sellTowerBtn.addEventListener('click', sellSelectedTower);
document.getElementById('closeInspectorBtn').addEventListener('click', () => {
  state.selectedPlaced = null;
  updateUI();
});
els.soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  els.soundBtn.textContent = soundOn ? '🔊' : '🔇';
  els.soundBtn.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
  if (soundOn) playTone(520, .1, 'sine', .03);
});

document.getElementById('letsGoBtn').addEventListener('click', () => {
  els.welcomeCard.hidden = true;
  showToast('Choose a capy, then tap the grass!');
});
document.querySelector('.close-welcome').addEventListener('click', () => { els.welcomeCard.hidden = true; });
document.getElementById('restartBtn').addEventListener('click', init);
document.getElementById('helpBtn').addEventListener('click', () => els.helpDialog.showModal());
document.getElementById('closeHelpBtn').addEventListener('click', () => els.helpDialog.close());
document.getElementById('gotItBtn').addEventListener('click', () => els.helpDialog.close());

window.addEventListener('keydown', (event) => {
  if (els.helpDialog.open) return;
  if (event.key === '1') selectTower('slinger');
  if (event.key === '2') selectTower('melon');
  if (event.key === '3') selectTower('chill');
  if (event.key === '4') selectTower('basket');
  if (event.key === 'Escape') {
    if (draggingTower) finishTowerDrag(true);
    hoverPoint = null;
    state.selectedPlaced = null;
    clearPlacementSelection();
    updateUI();
  }
  if (event.code === 'Space') {
    event.preventDefault();
    if (!state.waveActive) startWave();
    else { state.paused = !state.paused; updateUI(); }
  }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
init();
requestAnimationFrame(loop);
