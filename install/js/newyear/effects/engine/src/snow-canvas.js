const SPRITE_SIZE = 48;
const SPRITE_COUNT = 6;
const MAX_SNOW_POOL = 140;
const MAX_SPARKLE_POOL = 28;
const MAX_CONFETTI_POOL = 72;
const CONFETTI_COLORS = ['#ff4d4f', '#ffd666', '#52c41a', '#40a9ff', '#eb2f96', '#ffffff'];

function sanitizeHex(color, fallback)
{
	return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

export function profileAllowsMotion(profile)
{
	return Boolean(profile)
		&& profile.name !== 'off'
		&& Number(profile.targetFps) > 0;
}

function buildSpriteAtlas(snowColor)
{
	const atlas = document.createElement('canvas');
	atlas.width = SPRITE_SIZE * SPRITE_COUNT;
	atlas.height = SPRITE_SIZE;
	const ctx = atlas.getContext('2d');
	if (!ctx) {
		return atlas;
	}

	const half = SPRITE_SIZE / 2;
	const hex = sanitizeHex(snowColor, '#ffffff');

	// Sprite 0: мягкое дальнее боке
	{
		const cx = half;
		const cy = half;
		const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, half * 0.85);
		grad.addColorStop(0, hex);
		grad.addColorStop(0.45, hex + 'aa');
		grad.addColorStop(1, hex + '00');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, half * 0.85, 0, Math.PI * 2);
		ctx.fill();
	}

	// Sprite 1: классический 6-лучевой кристалл
	{
		const cx = SPRITE_SIZE + half;
		const cy = half;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.strokeStyle = hex;
		ctx.lineCap = 'round';
		ctx.lineWidth = 2.1;
		const r = half * 0.74;
		for (let i = 0; i < 6; i++) {
			ctx.save();
			ctx.rotate((Math.PI / 3) * i);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, -r);
			ctx.moveTo(0, -r * 0.55);
			ctx.lineTo(-r * 0.28, -r * 0.78);
			ctx.moveTo(0, -r * 0.55);
			ctx.lineTo(r * 0.28, -r * 0.78);
			ctx.stroke();
			ctx.restore();
		}
		ctx.fillStyle = hex;
		ctx.beginPath();
		ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	// Sprite 2: звёздная снежинка с шестигранником
	{
		const cx = SPRITE_SIZE * 2 + half;
		const cy = half;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.strokeStyle = hex;
		ctx.lineCap = 'round';
		ctx.lineWidth = 1.9;
		const r = half * 0.72;
		for (let i = 0; i < 6; i++) {
			ctx.save();
			ctx.rotate((Math.PI / 3) * i);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, -r);
			ctx.stroke();
			ctx.restore();
		}
		ctx.beginPath();
		for (let i = 0; i < 6; i++) {
			const a = (Math.PI / 3) * i - Math.PI / 2;
			const px = Math.cos(a) * r * 0.45;
			const py = Math.sin(a) * r * 0.45;
			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
		}
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
	}

	// Sprite 3: гранёный ледяной ромб-звезда
	{
		const cx = SPRITE_SIZE * 3 + half;
		const cy = half;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.fillStyle = hex;
		ctx.beginPath();
		const rOuter = half * 0.72;
		const rInner = half * 0.22;
		for (let i = 0; i < 8; i++) {
			const r = i % 2 === 0 ? rOuter : rInner;
			const a = (Math.PI / 4) * i;
			const px = Math.cos(a) * r;
			const py = Math.sin(a) * r;
			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
		}
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	// Sprite 4: пушистый мягкий снежок
	{
		const cx = SPRITE_SIZE * 4 + half;
		const cy = half;
		const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, half * 0.65);
		grad.addColorStop(0, hex);
		grad.addColorStop(0.65, hex + 'd9');
		grad.addColorStop(1, hex + '00');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, half * 0.65, 0, Math.PI * 2);
		ctx.fill();
	}

	// Sprite 5: золотая искра для курсора
	{
		const cx = SPRITE_SIZE * 5 + half;
		const cy = half;
		ctx.save();
		ctx.translate(cx, cy);
		const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, half * 0.72);
		grad.addColorStop(0, '#fffbeb');
		grad.addColorStop(0.35, '#fde047ee');
		grad.addColorStop(1, '#f59e0b00');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(0, 0, half * 0.72, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#fffbeb';
		ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const r = i % 2 === 0 ? half * 0.68 : half * 0.14;
			const a = (Math.PI / 4) * i;
			const px = Math.cos(a) * r;
			const py = Math.sin(a) * r;
			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
		}
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	return atlas;
}

export class SnowCanvasEngine
{
	constructor(config, governor, mountTarget)
	{
		this.snowConfig = config.snow || {};
		this.sparklesConfig = config.sparkles || {};
		this.governor = governor;
		this.mountTarget = mountTarget || document.body;
		this.isScoped = this.mountTarget !== document.body;

		this.canvas = null;
		this.ctx = null;
		this.atlas = null;
		this.width = 0;
		this.height = 0;
		this.dpr = 1;

		this.snowPool = [];
		this.activeSnowCount = 0;
		this.sparklePool = [];
		this.sparkleCursor = 0;
		this.activeSparkles = 0;
		this.confettiPool = [];
		this.activeConfetti = 0;

		this.rafId = 0;
		this.running = false;
		this.paused = false;
		this.lastFrameTime = 0;
		this.lastRenderTime = 0;
		this.elapsed = 0;

		this.pointerX = -9999;
		this.pointerY = -9999;
		this.pointerVx = 0;
		this.lastPointerEmit = 0;
		this.pointerRect = null;
		this.pointerTarget = this.isScoped ? this.mountTarget : window;
		this.pointerListening = false;

		this.onResize = this.handleResize.bind(this);
		this.onPointerMove = this.handlePointerMove.bind(this);
		this.onScroll = this.refreshPointerRect.bind(this);
		this.onLoop = this.loop.bind(this);
		this.resizeObserver = null;
		this.resizeTimer = 0;
	}

	mount()
	{
		this.destroy();

		const profile = this.governor.getProfile();
		if (profile.name === 'off') {
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.className = 'ny-fx-canvas' + (this.isScoped ? ' ny-fx-canvas--scoped' : '');
		canvas.setAttribute('aria-hidden', 'true');
		this.mountTarget.append(canvas);

		this.canvas = canvas;
		this.ctx = canvas.getContext('2d', { alpha: true });
		if (!this.ctx) {
			canvas.remove();
			this.canvas = null;

			return;
		}

		this.atlas = buildSpriteAtlas(this.snowConfig.color || '#ffffff');
		this.initPools();
		this.updateCanvasSize();
		this.applyProfile(profile);

		if (this.isScoped && typeof ResizeObserver === 'function') {
			this.resizeObserver = new ResizeObserver(() => this.handleResize());
			this.resizeObserver.observe(this.mountTarget);
		} else {
			window.addEventListener('resize', this.onResize, { passive: true });
		}

		this.ensureRunning();
	}

	initPools()
	{
		this.snowPool = new Array(MAX_SNOW_POOL);
		for (let i = 0; i < MAX_SNOW_POOL; i++) {
			this.snowPool[i] = {
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				size: 10,
				alpha: 0.8,
				layer: 1,
				sprite: 1,
				phase: 0,
				swayAmp: 12,
				swayFreq: 1,
				angle: 0,
				spin: 0,
			};
		}

		this.sparklePool = new Array(MAX_SPARKLE_POOL);
		for (let i = 0; i < MAX_SPARKLE_POOL; i++) {
			this.sparklePool[i] = {
				active: false,
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				size: 12,
				life: 0,
				maxLife: 0.6,
			};
		}

		this.confettiPool = new Array(MAX_CONFETTI_POOL);
		for (let i = 0; i < MAX_CONFETTI_POOL; i++) {
			this.confettiPool[i] = {
				active: false,
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				w: 7,
				h: 4,
				color: '#ffd666',
				angle: 0,
				spin: 0,
				life: 0,
				maxLife: 1.8,
			};
		}
	}

	updateCanvasSize()
	{
		if (!this.canvas || !this.ctx) {
			return;
		}

		const profile = this.governor.getProfile();
		const rect = this.isScoped
			? this.mountTarget.getBoundingClientRect()
			: { width: window.innerWidth, height: window.innerHeight };
		this.pointerRect = this.isScoped ? rect : null;

		this.width = Math.max(1, Math.floor(rect.width));
		this.height = Math.max(1, Math.floor(rect.height));
		this.dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr || 1.5);

		this.canvas.width = Math.floor(this.width * this.dpr);
		this.canvas.height = Math.floor(this.height * this.dpr);
		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
	}

	handleResize()
	{
		clearTimeout(this.resizeTimer);
		this.resizeTimer = setTimeout(() => {
			this.updateCanvasSize();
			this.applyProfile(this.governor.getProfile());
		}, 120);
	}

	applyProfile(profile)
	{
		if (!this.canvas || !this.ctx) {
			return;
		}

		const targetDpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr || 1.5);
		if (Math.abs(targetDpr - this.dpr) > 0.05) {
			this.updateCanvasSize();
		}

		const areaScale = this.isScoped
			? Math.max(0.25, Math.min(1, (this.width * this.height) / (960 * 540)))
			: Math.max(0.45, Math.min(1.15, (this.width * this.height) / (1440 * 900)));

		const intensity = Math.max(1, Math.min(100, Number(this.snowConfig.intensity) || 55));
		const desired = this.snowConfig.enabled && profileAllowsMotion(profile)
			? Math.round(intensity * 1.15 * profile.particleScale * areaScale)
			: 0;

		const prevCount = this.activeSnowCount;
		this.activeSnowCount = Math.max(0, Math.min(MAX_SNOW_POOL, desired));

		for (let i = prevCount; i < this.activeSnowCount; i++) {
			this.resetFlake(this.snowPool[i], true);
		}

		if (!profileAllowsMotion(profile)) {
			this.clearTransientParticles();
		}

		this.syncPointerInteraction(profile);

		if (this.activeSnowCount === 0 && this.activeSparkles === 0 && this.activeConfetti === 0) {
			this.stopLoop();
			this.ctx.clearRect(0, 0, this.width, this.height);
		} else {
			this.ensureRunning();
		}
	}

	clearTransientParticles()
	{
		this.sparklePool.forEach((particle) => {
			particle.active = false;
		});
		this.confettiPool.forEach((particle) => {
			particle.active = false;
		});
		this.activeSparkles = 0;
		this.activeConfetti = 0;
	}

	resetFlake(flake, randomY)
	{
		const profile = this.governor.getProfile();
		const useDepth = Boolean(this.snowConfig.depth) && profile.enableDepth;

		const sizeMin = Math.max(3, Number(this.snowConfig.sizeMin) || 6);
		const sizeMax = Math.max(sizeMin + 2, Number(this.snowConfig.sizeMax) || 18);
		const speedBase = Math.max(1, Math.min(10, Number(this.snowConfig.speed) || 4));

		let layer = 1;
		if (useDepth) {
			const rnd = Math.random();
			layer = rnd < 0.38 ? 0 : (rnd < 0.82 ? 1 : 2);
		}

		const layerSpeedMult = layer === 0 ? 0.55 : (layer === 1 ? 1.0 : 1.42);
		const layerSizeMult = layer === 0 ? 0.62 : (layer === 1 ? 1.0 : 1.28);

		flake.layer = layer;
		flake.size = (sizeMin + Math.random() * (sizeMax - sizeMin)) * layerSizeMult;
		flake.x = Math.random() * (this.width + 40) - 20;
		flake.y = randomY ? Math.random() * this.height : -flake.size - Math.random() * 24;
		flake.vy = (22 + speedBase * 12 + Math.random() * 24) * layerSpeedMult;
		flake.vx = (Math.random() - 0.5) * 14;
		flake.alpha = layer === 0
			? 0.32 + Math.random() * 0.25
			: (layer === 1 ? 0.62 + Math.random() * 0.28 : 0.78 + Math.random() * 0.22);
		flake.sprite = layer === 0
			? (Math.random() < 0.7 ? 0 : 4)
			: (1 + Math.floor(Math.random() * 4));
		flake.phase = Math.random() * Math.PI * 2;
		flake.swayAmp = (8 + Math.random() * 18) * layerSpeedMult;
		flake.swayFreq = 0.6 + Math.random() * 1.1;
		flake.angle = Math.random() * Math.PI * 2;
		flake.spin = (Math.random() - 0.5) * 0.9;
	}

	refreshPointerRect()
	{
		if (!this.isScoped) {
			this.pointerRect = null;

			return null;
		}

		this.pointerRect = this.mountTarget.getBoundingClientRect();

		return this.pointerRect;
	}

	shouldTrackPointer(profile)
	{
		return profileAllowsMotion(profile) && (
			(Boolean(this.snowConfig.interactive) && profile.enableInteractive)
			|| (Boolean(this.sparklesConfig.enabled) && profile.enableSparkles)
		);
	}

	syncPointerInteraction(profile)
	{
		const shouldListen = this.shouldTrackPointer(profile);
		if (shouldListen && !this.pointerListening) {
			this.pointerTarget.addEventListener('pointermove', this.onPointerMove, { passive: true });
			if (this.isScoped) {
				this.refreshPointerRect();
				window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
			}
			this.pointerListening = true;

			return;
		}

		if (!shouldListen) {
			this.removePointerInteraction();
		}
	}

	removePointerInteraction()
	{
		if (!this.pointerListening) {
			return;
		}

		this.pointerTarget.removeEventListener('pointermove', this.onPointerMove);
		if (this.isScoped) {
			window.removeEventListener('scroll', this.onScroll, true);
		}
		this.pointerListening = false;
		this.pointerX = -9999;
		this.pointerY = -9999;
		this.pointerVx = 0;
	}

	handlePointerMove(event)
	{
		if (this.paused) {
			return;
		}

		const profile = this.governor.getProfile();
		if (!this.shouldTrackPointer(profile)) {
			return;
		}

		let x = event.clientX;
		let y = event.clientY;
		if (this.isScoped) {
			const rect = this.pointerRect || this.refreshPointerRect();
			if (!rect) {
				return;
			}
			x -= rect.left;
			y -= rect.top;
		}

		this.pointerVx = Math.max(-45, Math.min(45, x - this.pointerX));
		this.pointerX = x;
		this.pointerY = y;

		if (this.sparklesConfig.enabled && profile.enableSparkles) {
			const now = performance.now();
			if (now - this.lastPointerEmit > 34) {
				this.lastPointerEmit = now;
				this.emitSparkle(x, y);
				this.ensureRunning();
			}
		}
	}

	emitSparkle(x, y)
	{
		const p = this.sparklePool[this.sparkleCursor];
		this.sparkleCursor = (this.sparkleCursor + 1) % MAX_SPARKLE_POOL;
		if (!p.active) {
			this.activeSparkles++;
		}
		p.active = true;
		p.x = x + (Math.random() - 0.5) * 10;
		p.y = y + (Math.random() - 0.5) * 10;
		p.vx = (Math.random() - 0.5) * 28;
		p.vy = -12 - Math.random() * 26;
		p.size = 10 + Math.random() * 12;
		p.life = 0;
		p.maxLife = 0.48 + Math.random() * 0.35;
	}

	celebrate(originX, originY)
	{
		if (!this.canvas || !this.ctx) {
			return;
		}

		const profile = this.governor.getProfile();
		if (!profileAllowsMotion(profile)) {
			return;
		}

		const cx = typeof originX === 'number' ? originX : this.width * 0.5;
		const cy = typeof originY === 'number' ? originY : this.height * 0.35;
		const burstCount = profile.name === 'eco' || profile.name === 'static' ? 28 : 56;

		let spawned = 0;
		for (let i = 0; i < MAX_CONFETTI_POOL && spawned < burstCount; i++) {
			const c = this.confettiPool[i];
			if (!c.active) {
				this.activeConfetti++;
			}
			const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
			const speed = 130 + Math.random() * 260;
			c.active = true;
			c.x = cx + (Math.random() - 0.5) * 18;
			c.y = cy + (Math.random() - 0.5) * 12;
			c.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 70;
			c.vy = Math.sin(angle) * speed - 40;
			c.w = 6 + Math.random() * 5;
			c.h = 3.5 + Math.random() * 3;
			c.color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
			c.angle = Math.random() * Math.PI * 2;
			c.spin = (Math.random() - 0.5) * 10;
			c.life = 0;
			c.maxLife = 1.4 + Math.random() * 0.9;
			spawned++;
		}

		this.ensureRunning();
	}

	pause()
	{
		this.paused = true;
		this.stopLoop();
	}

	resume()
	{
		this.paused = false;
		this.lastFrameTime = 0;
		this.lastRenderTime = 0;
		this.ensureRunning();
	}

	ensureRunning()
	{
		if (this.running || this.paused || !this.ctx) {
			return;
		}

		if (this.activeSnowCount === 0 && this.activeSparkles === 0 && this.activeConfetti === 0) {
			return;
		}

		this.running = true;
		this.lastFrameTime = 0;
		this.lastRenderTime = 0;
		this.rafId = window.requestAnimationFrame(this.onLoop);
	}

	stopLoop()
	{
		this.running = false;
		if (this.rafId) {
			window.cancelAnimationFrame(this.rafId);
			this.rafId = 0;
		}
	}

	loop(now)
	{
		if (!this.running || this.paused || !this.ctx) {
			return;
		}

		const profile = this.governor.getProfile();
		const targetFps = profile.targetFps;
		if (!profileAllowsMotion(profile)) {
			this.stopLoop();
			this.clearTransientParticles();
			this.ctx.clearRect(0, 0, this.width, this.height);

			return;
		}

		const minInterval = 1000 / targetFps;
		if (this.lastRenderTime > 0 && (now - this.lastRenderTime) < minInterval - 1) {
			this.rafId = window.requestAnimationFrame(this.onLoop);

			return;
		}

		const rawDeltaMs = this.lastFrameTime > 0 ? now - this.lastFrameTime : minInterval;
		this.lastFrameTime = now;
		this.lastRenderTime = now;

		this.governor.recordFrame(rawDeltaMs, now);

		const dt = Math.min(0.05, rawDeltaMs / 1000);
		this.elapsed += dt;

		this.renderFrame(dt, profile);

		if (this.activeSnowCount === 0 && this.activeSparkles === 0 && this.activeConfetti === 0) {
			this.stopLoop();
			this.ctx.clearRect(0, 0, this.width, this.height);

			return;
		}

		this.rafId = window.requestAnimationFrame(this.onLoop);
	}

	renderFrame(dt, profile)
	{
		const ctx = this.ctx;
		ctx.clearRect(0, 0, this.width, this.height);

		// 1. Снежинки (sprite atlas drawImage)
		if (this.activeSnowCount > 0 && this.atlas) {
			const windStrength = Math.max(0, Math.min(10, Number(this.snowConfig.wind) || 0));
			const globalWind = windStrength > 0
				? Math.sin(this.elapsed * 0.45) * windStrength * 7.5 + windStrength * 2.2
				: 0;
			const allowInteractive = Boolean(this.snowConfig.interactive) && profile.enableInteractive;
			const allowRotate = profile.enableRotation;

			for (let i = 0; i < this.activeSnowCount; i++) {
				const f = this.snowPool[i];
				const sway = Math.sin(this.elapsed * f.swayFreq + f.phase) * f.swayAmp;
				let pushX = 0;

				if (allowInteractive && this.pointerX > -500) {
					const dx = f.x - this.pointerX;
					const dy = f.y - this.pointerY;
					const distSq = dx * dx + dy * dy;
					if (distSq < 11000 && distSq > 4) {
						const factor = (1 - distSq / 11000) * 90;
						pushX = (dx > 0 ? 1 : -1) * factor + this.pointerVx * 0.45;
					}
				}

				f.x += (f.vx + globalWind + sway * 0.45 + pushX) * dt;
				f.y += f.vy * dt;

				if (f.y > this.height + f.size) {
					this.resetFlake(f, false);
				} else if (f.x < -f.size - 24) {
					f.x = this.width + f.size;
				} else if (f.x > this.width + f.size + 24) {
					f.x = -f.size;
				}

				ctx.globalAlpha = f.alpha;
				const sx = f.sprite * SPRITE_SIZE;

				if (allowRotate && f.layer === 2) {
					f.angle += f.spin * dt;
					ctx.save();
					ctx.translate(f.x | 0, f.y | 0);
					ctx.rotate(f.angle);
					ctx.drawImage(this.atlas, sx, 0, SPRITE_SIZE, SPRITE_SIZE, -f.size * 0.5, -f.size * 0.5, f.size, f.size);
					ctx.restore();
				} else {
					ctx.drawImage(
						this.atlas,
						sx,
						0,
						SPRITE_SIZE,
						SPRITE_SIZE,
						(f.x - f.size * 0.5) | 0,
						(f.y - f.size * 0.5) | 0,
						f.size,
						f.size,
					);
				}
			}
		}

		// 2. Искры за курсором
		if (this.activeSparkles > 0 && this.atlas) {
			const sx = 5 * SPRITE_SIZE;
			for (let i = 0; i < MAX_SPARKLE_POOL; i++) {
				const p = this.sparklePool[i];
				if (!p.active) {
					continue;
				}

				p.life += dt;
				if (p.life >= p.maxLife) {
					p.active = false;
					this.activeSparkles = Math.max(0, this.activeSparkles - 1);
					continue;
				}

				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.vy += 42 * dt;

				const progress = p.life / p.maxLife;
				const scale = 1 - progress * 0.65;
				const drawSize = p.size * scale;

				ctx.globalAlpha = (1 - progress) * 0.92;
				ctx.drawImage(
					this.atlas,
					sx,
					0,
					SPRITE_SIZE,
					SPRITE_SIZE,
					(p.x - drawSize * 0.5) | 0,
					(p.y - drawSize * 0.5) | 0,
					drawSize,
					drawSize,
				);
			}
		}

		// 3. Конфетти салюта
		if (this.activeConfetti > 0) {
			for (let i = 0; i < MAX_CONFETTI_POOL; i++) {
				const c = this.confettiPool[i];
				if (!c.active) {
					continue;
				}

				c.life += dt;
				if (c.life >= c.maxLife) {
					c.active = false;
					this.activeConfetti = Math.max(0, this.activeConfetti - 1);
					continue;
				}

				c.vx *= 0.985;
				c.vy += 420 * dt;
				c.x += c.vx * dt;
				c.y += c.vy * dt;
				c.angle += c.spin * dt;

				const alpha = Math.max(0, 1 - Math.pow(c.life / c.maxLife, 1.8));
				ctx.save();
				ctx.globalAlpha = alpha;
				ctx.translate(c.x, c.y);
				ctx.rotate(c.angle);
				ctx.fillStyle = c.color;
				ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
				ctx.restore();
			}
		}

		ctx.globalAlpha = 1;
		this.pointerVx *= 0.82;
	}

	destroy()
	{
		this.stopLoop();
		clearTimeout(this.resizeTimer);

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		} else {
			window.removeEventListener('resize', this.onResize);
		}

		this.removePointerInteraction();

		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
		}
		this.canvas = null;
		this.ctx = null;
		this.atlas = null;
		this.pointerRect = null;
	}
}
