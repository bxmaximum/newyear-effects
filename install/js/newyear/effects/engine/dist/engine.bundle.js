/* eslint-disable */
this.BX = this.BX || {};
this.BX.Newyear = this.BX.Newyear || {};
this.BX.Newyear.Effects = this.BX.Newyear.Effects || {};
(function (exports) {
	'use strict';

	const TIER_PROFILES = {
		high: {
			name: 'high',
			maxDpr: 1.5,
			targetFps: 60,
			particleScale: 1.0,
			enableDepth: true,
			enableInteractive: true,
			enableSparkles: true,
			enableRotation: true,
			garlandStaticOnly: false
		},
		balanced: {
			name: 'balanced',
			maxDpr: 1.25,
			targetFps: 45,
			particleScale: 0.65,
			enableDepth: true,
			enableInteractive: true,
			enableSparkles: true,
			enableRotation: false,
			garlandStaticOnly: false
		},
		eco: {
			name: 'eco',
			maxDpr: 1.0,
			targetFps: 30,
			particleScale: 0.35,
			enableDepth: false,
			enableInteractive: false,
			enableSparkles: false,
			enableRotation: false,
			garlandStaticOnly: false
		},
		static: {
			name: 'static',
			maxDpr: 1.0,
			targetFps: 0,
			particleScale: 0,
			enableDepth: false,
			enableInteractive: false,
			enableSparkles: false,
			enableRotation: false,
			garlandStaticOnly: true
		},
		off: {
			name: 'off',
			maxDpr: 1.0,
			targetFps: 0,
			particleScale: 0,
			enableDepth: false,
			enableInteractive: false,
			enableSparkles: false,
			enableRotation: false,
			garlandStaticOnly: true
		}
	};
	const TIER_ORDER = ['high', 'balanced', 'eco', 'static'];
	function isMobileViewport(viewportWidth, hasCoarsePointer) {
		return viewportWidth < 768 || hasCoarsePointer;
	}
	class PerformanceGovernor {
		constructor(config, onTierChange) {
			this.config = config || {};
			this.onTierChange = typeof onTierChange === 'function' ? onTierChange : () => {};
			this.isAuto = (this.config.mode || 'auto') === 'auto';
			this.tierName = this.detectInitialTier();
			this.frameSamples = new Float32Array(40);
			this.sampleIndex = 0;
			this.sampleCount = 0;
			this.lastEvalTime = 0;
			this.lowEcoWindows = 0;
			this.lastMeasuredFps = 60;
			this.motionMedia = null;
			this.onMotionChange = null;
			this.bindReducedMotion();
		}
		detectInitialTier() {
			const respectReduced = this.config.respectReducedMotion !== false;
			if (respectReduced && this.prefersReducedMotion()) {
				return 'static';
			}
			const isMobile = this.isMobileViewport();
			const mobileMode = this.config.mobileMode || 'eco';
			if (isMobile && mobileMode === 'off') {
				return 'off';
			}
			const requested = this.config.mode || 'auto';
			let tier;
			if (requested !== 'auto' && TIER_PROFILES[requested]) {
				tier = requested;
			} else {
				tier = this.detectHardwareTier();
			}
			if (isMobile && mobileMode === 'eco' && (tier === 'high' || tier === 'balanced')) {
				tier = 'eco';
			}
			return tier;
		}
		detectHardwareTier() {
			const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
			if (conn && conn.saveData) {
				return 'eco';
			}
			const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 4;
			const memory = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : 4;
			if (cores <= 2 || memory <= 2) {
				return 'eco';
			}
			if (cores <= 4 || memory <= 4) {
				return 'balanced';
			}
			return 'high';
		}
		prefersReducedMotion() {
			return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		}
		isMobileViewport() {
			const hasCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
			return isMobileViewport(window.innerWidth, hasCoarsePointer);
		}
		bindReducedMotion() {
			if (this.config.respectReducedMotion === false || typeof window.matchMedia !== 'function') {
				return;
			}
			this.motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
			this.onMotionChange = event => {
				if (event.matches) {
					this.setTier('static');
				} else {
					this.setTier(this.detectInitialTier());
				}
			};
			if (typeof this.motionMedia.addEventListener === 'function') {
				this.motionMedia.addEventListener('change', this.onMotionChange);
			}
		}
		getProfile() {
			return TIER_PROFILES[this.tierName] || TIER_PROFILES.eco;
		}
		getStats() {
			return {
				tier: this.tierName,
				fps: Math.round(this.lastMeasuredFps),
				auto: this.isAuto
			};
		}
		recordFrame(deltaMs, now) {
			if (!this.isAuto || this.tierName === 'static' || this.tierName === 'off') {
				return;
			}

			// Игнорируем разовые скачки после переключения вкладок
			if (deltaMs <= 0 || deltaMs > 250) {
				return;
			}
			this.frameSamples[this.sampleIndex] = deltaMs;
			this.sampleIndex = (this.sampleIndex + 1) % this.frameSamples.length;
			if (this.sampleCount < this.frameSamples.length) {
				this.sampleCount++;
			}
			if (this.lastEvalTime === 0) {
				this.lastEvalTime = now;
				return;
			}
			if (now - this.lastEvalTime < 1800 || this.sampleCount < 20) {
				return;
			}
			this.lastEvalTime = now;
			let total = 0;
			for (let i = 0; i < this.sampleCount; i++) {
				total += this.frameSamples[i];
			}
			const avgDelta = total / this.sampleCount;
			const avgFps = avgDelta > 0 ? 1000 / avgDelta : 60;
			this.lastMeasuredFps = avgFps;
			if (this.tierName === 'high' && avgFps < 40) {
				this.stepDown();
			} else if (this.tierName === 'balanced' && avgFps < 26) {
				this.stepDown();
			} else if (this.tierName === 'eco') {
				if (avgFps < 17) {
					this.lowEcoWindows++;
					if (this.lowEcoWindows >= 2) {
						this.stepDown();
					}
				} else {
					this.lowEcoWindows = 0;
				}
			}
		}
		stepDown() {
			const idx = TIER_ORDER.indexOf(this.tierName);
			if (idx >= 0 && idx < TIER_ORDER.length - 1) {
				this.sampleCount = 0;
				this.sampleIndex = 0;
				this.setTier(TIER_ORDER[idx + 1]);
			}
		}
		setTier(nextTier) {
			if (!TIER_PROFILES[nextTier] || nextTier === this.tierName) {
				return;
			}
			this.tierName = nextTier;
			this.onTierChange(this.getProfile());
		}
		destroy() {
			if (this.motionMedia && this.onMotionChange && typeof this.motionMedia.removeEventListener === 'function') {
				this.motionMedia.removeEventListener('change', this.onMotionChange);
			}
		}
	}

	const SPRITE_SIZE = 48;
	const SPRITE_COUNT = 6;
	const MAX_SNOW_POOL = 140;
	const MAX_SPARKLE_POOL = 28;
	const MAX_CONFETTI_POOL = 72;
	const CONFETTI_COLORS = ['#ff4d4f', '#ffd666', '#52c41a', '#40a9ff', '#eb2f96', '#ffffff'];
	function sanitizeHex(color, fallback) {
		return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
	}
	function profileAllowsMotion(profile) {
		return Boolean(profile) && profile.name !== 'off' && Number(profile.targetFps) > 0;
	}
	function buildSpriteAtlas(snowColor) {
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
				ctx.rotate(Math.PI / 3 * i);
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
				ctx.rotate(Math.PI / 3 * i);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(0, -r);
				ctx.stroke();
				ctx.restore();
			}
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = Math.PI / 3 * i - Math.PI / 2;
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
				const a = Math.PI / 4 * i;
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
				const a = Math.PI / 4 * i;
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
	class SnowCanvasEngine {
		constructor(config, governor, mountTarget) {
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
		mount() {
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
			this.ctx = canvas.getContext('2d', {
				alpha: true
			});
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
				window.addEventListener('resize', this.onResize, {
					passive: true
				});
			}
			this.ensureRunning();
		}
		initPools() {
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
					spin: 0
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
					maxLife: 0.6
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
					maxLife: 1.8
				};
			}
		}
		updateCanvasSize() {
			if (!this.canvas || !this.ctx) {
				return;
			}
			const profile = this.governor.getProfile();
			const rect = this.isScoped ? this.mountTarget.getBoundingClientRect() : {
				width: window.innerWidth,
				height: window.innerHeight
			};
			this.pointerRect = this.isScoped ? rect : null;
			this.width = Math.max(1, Math.floor(rect.width));
			this.height = Math.max(1, Math.floor(rect.height));
			this.dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr || 1.5);
			this.canvas.width = Math.floor(this.width * this.dpr);
			this.canvas.height = Math.floor(this.height * this.dpr);
			this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		}
		handleResize() {
			clearTimeout(this.resizeTimer);
			this.resizeTimer = setTimeout(() => {
				this.updateCanvasSize();
				this.applyProfile(this.governor.getProfile());
			}, 120);
		}
		applyProfile(profile) {
			if (!this.canvas || !this.ctx) {
				return;
			}
			const targetDpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr || 1.5);
			if (Math.abs(targetDpr - this.dpr) > 0.05) {
				this.updateCanvasSize();
			}
			const areaScale = this.isScoped ? Math.max(0.25, Math.min(1, this.width * this.height / (960 * 540))) : Math.max(0.45, Math.min(1.15, this.width * this.height / (1440 * 900)));
			const intensity = Math.max(1, Math.min(100, Number(this.snowConfig.intensity) || 55));
			const desired = this.snowConfig.enabled && profileAllowsMotion(profile) ? Math.round(intensity * 1.15 * profile.particleScale * areaScale) : 0;
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
		clearTransientParticles() {
			this.sparklePool.forEach(particle => {
				particle.active = false;
			});
			this.confettiPool.forEach(particle => {
				particle.active = false;
			});
			this.activeSparkles = 0;
			this.activeConfetti = 0;
		}
		resetFlake(flake, randomY) {
			const profile = this.governor.getProfile();
			const useDepth = Boolean(this.snowConfig.depth) && profile.enableDepth;
			const sizeMin = Math.max(3, Number(this.snowConfig.sizeMin) || 6);
			const sizeMax = Math.max(sizeMin + 2, Number(this.snowConfig.sizeMax) || 18);
			const speedBase = Math.max(1, Math.min(10, Number(this.snowConfig.speed) || 4));
			let layer = 1;
			if (useDepth) {
				const rnd = Math.random();
				layer = rnd < 0.38 ? 0 : rnd < 0.82 ? 1 : 2;
			}
			const layerSpeedMult = layer === 0 ? 0.55 : layer === 1 ? 1.0 : 1.42;
			const layerSizeMult = layer === 0 ? 0.62 : layer === 1 ? 1.0 : 1.28;
			flake.layer = layer;
			flake.size = (sizeMin + Math.random() * (sizeMax - sizeMin)) * layerSizeMult;
			flake.x = Math.random() * (this.width + 40) - 20;
			flake.y = randomY ? Math.random() * this.height : -flake.size - Math.random() * 24;
			flake.vy = (22 + speedBase * 12 + Math.random() * 24) * layerSpeedMult;
			flake.vx = (Math.random() - 0.5) * 14;
			flake.alpha = layer === 0 ? 0.32 + Math.random() * 0.25 : layer === 1 ? 0.62 + Math.random() * 0.28 : 0.78 + Math.random() * 0.22;
			flake.sprite = layer === 0 ? Math.random() < 0.7 ? 0 : 4 : 1 + Math.floor(Math.random() * 4);
			flake.phase = Math.random() * Math.PI * 2;
			flake.swayAmp = (8 + Math.random() * 18) * layerSpeedMult;
			flake.swayFreq = 0.6 + Math.random() * 1.1;
			flake.angle = Math.random() * Math.PI * 2;
			flake.spin = (Math.random() - 0.5) * 0.9;
		}
		refreshPointerRect() {
			if (!this.isScoped) {
				this.pointerRect = null;
				return null;
			}
			this.pointerRect = this.mountTarget.getBoundingClientRect();
			return this.pointerRect;
		}
		shouldTrackPointer(profile) {
			return profileAllowsMotion(profile) && (Boolean(this.snowConfig.interactive) && profile.enableInteractive || Boolean(this.sparklesConfig.enabled) && profile.enableSparkles);
		}
		syncPointerInteraction(profile) {
			const shouldListen = this.shouldTrackPointer(profile);
			if (shouldListen && !this.pointerListening) {
				this.pointerTarget.addEventListener('pointermove', this.onPointerMove, {
					passive: true
				});
				if (this.isScoped) {
					this.refreshPointerRect();
					window.addEventListener('scroll', this.onScroll, {
						passive: true,
						capture: true
					});
				}
				this.pointerListening = true;
				return;
			}
			if (!shouldListen) {
				this.removePointerInteraction();
			}
		}
		removePointerInteraction() {
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
		handlePointerMove(event) {
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
		emitSparkle(x, y) {
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
		celebrate(originX, originY) {
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
		pause() {
			this.paused = true;
			this.stopLoop();
		}
		resume() {
			this.paused = false;
			this.lastFrameTime = 0;
			this.lastRenderTime = 0;
			this.ensureRunning();
		}
		ensureRunning() {
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
		stopLoop() {
			this.running = false;
			if (this.rafId) {
				window.cancelAnimationFrame(this.rafId);
				this.rafId = 0;
			}
		}
		loop(now) {
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
			if (this.lastRenderTime > 0 && now - this.lastRenderTime < minInterval - 1) {
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
		renderFrame(dt, profile) {
			const ctx = this.ctx;
			ctx.clearRect(0, 0, this.width, this.height);

			// 1. Снежинки (sprite atlas drawImage)
			if (this.activeSnowCount > 0 && this.atlas) {
				const windStrength = Math.max(0, Math.min(10, Number(this.snowConfig.wind) || 0));
				const globalWind = windStrength > 0 ? Math.sin(this.elapsed * 0.45) * windStrength * 7.5 + windStrength * 2.2 : 0;
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
						ctx.drawImage(this.atlas, sx, 0, SPRITE_SIZE, SPRITE_SIZE, f.x - f.size * 0.5 | 0, f.y - f.size * 0.5 | 0, f.size, f.size);
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
					ctx.drawImage(this.atlas, sx, 0, SPRITE_SIZE, SPRITE_SIZE, p.x - drawSize * 0.5 | 0, p.y - drawSize * 0.5 | 0, drawSize, drawSize);
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
		destroy() {
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

	const GARLAND_SVG_NS = 'http://www.w3.org/2000/svg';
	const VALID_MODES = new Set(['twinkle', 'wave', 'chase', 'sparkle', 'steady']);
	const FALLBACK_COLORS = ['#ffd666', '#ffec99', '#ffa940', '#fff1b8', '#ffc53d'];
	function sanitizeColors(colors) {
		if (!Array.isArray(colors)) {
			return FALLBACK_COLORS;
		}
		const valid = colors.filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.trim()));
		return valid.length > 0 ? valid : FALLBACK_COLORS;
	}
	function shouldPauseGarland(documentPaused, isIntersecting) {
		return documentPaused || !isIntersecting;
	}
	class GarlandManager {
		constructor(config, rootNode) {
			this.config = config || {};
			this.rootNode = rootNode || document;
			this.instances = [];
			this.intersectionObserver = null;
			this.staticOnly = false;
			this.documentPaused = false;
		}
		mount(staticOnly = false) {
			this.destroy();
			this.staticOnly = Boolean(staticOnly);
			if (!this.config.enabled) {
				return;
			}
			const selector = typeof this.config.selector === 'string' && this.config.selector.trim() ? this.config.selector.trim() : 'header, .header, #header';
			let targets = [];
			try {
				targets = Array.from(this.rootNode.querySelectorAll(selector));
			} catch (e) {
				return;
			}
			if (targets.length === 0) {
				return;
			}
			if (typeof IntersectionObserver === 'function') {
				this.intersectionObserver = new IntersectionObserver(entries => {
					entries.forEach(entry => {
						const inst = this.instances.find(item => item.container === entry.target);
						if (inst) {
							inst.isIntersecting = entry.isIntersecting;
							this.syncPausedState(inst);
						}
					});
				}, {
					rootMargin: '60px'
				});
			}
			targets.slice(0, 6).forEach(target => {
				this.mountOnElement(target);
			});
		}
		mountOnElement(target) {
			if (target.dataset.nyFxGarland === '1') {
				return;
			}
			let modifiedPosition = false;
			if (window.getComputedStyle(target).position === 'static') {
				target.style.position = 'relative';
				modifiedPosition = true;
			}
			const mode = this.staticOnly ? 'steady' : VALID_MODES.has(this.config.mode) ? this.config.mode : 'twinkle';
			const container = document.createElement('div');
			container.className = 'ny-fx-garland ny-fx-garland--mode-' + mode;
			container.setAttribute('aria-hidden', 'true');
			const offsetTop = Math.max(-20, Math.min(120, Number(this.config.offsetTop) || 0));
			container.style.top = offsetTop + 'px';
			const speedMs = Math.max(300, Math.min(4000, Number(this.config.speed) || 1200));
			container.style.setProperty('--ny-garland-dur', speedMs + 'ms');
			target.dataset.nyFxGarland = '1';
			target.prepend(container);
			const instance = {
				target,
				container,
				modifiedPosition,
				bulbs: [],
				bulbPositions: [],
				resizeObserver: null,
				resizeTimer: 0,
				lastWidth: 0,
				onPointerMove: null,
				lastHoverTime: 0,
				isIntersecting: true
			};
			this.buildStrands(instance);
			if (typeof ResizeObserver === 'function') {
				instance.resizeObserver = new ResizeObserver(() => {
					clearTimeout(instance.resizeTimer);
					instance.resizeTimer = setTimeout(() => this.buildStrands(instance), 140);
				});
				instance.resizeObserver.observe(target);
			}
			if (this.intersectionObserver) {
				this.intersectionObserver.observe(container);
			}
			this.syncPointerInteraction(instance);
			this.syncPausedState(instance);
			this.instances.push(instance);
		}
		buildStrands(instance) {
			const width = Math.floor(instance.target.clientWidth || instance.container.clientWidth);
			if (width < 40 || Math.abs(width - instance.lastWidth) < 12) {
				return;
			}
			instance.lastWidth = width;
			const colors = sanitizeColors(this.config.colors);
			const spacing = width < 480 ? 44 : 42;
			const bulbCount = Math.max(4, Math.min(48, Math.floor(width / spacing)));
			const step = width / bulbCount;
			const speedMs = Math.max(300, Math.min(4000, Number(this.config.speed) || 1200));
			const mode = this.staticOnly ? 'steady' : VALID_MODES.has(this.config.mode) ? this.config.mode : 'twinkle';

			// Считаем реалистичную провисающую дугу (catenary-эффект по пролётам по 4 лампочки)
			const svg = document.createElementNS(GARLAND_SVG_NS, 'svg');
			svg.setAttribute('class', 'ny-fx-garland__wire');
			svg.setAttribute('viewBox', '0 0 ' + width + ' 38');
			svg.setAttribute('preserveAspectRatio', 'none');
			const spanCount = Math.max(2, Math.round(width / 190));
			const spanWidth = width / spanCount;
			let pathD = 'M 0 3';
			for (let s = 0; s < spanCount; s++) {
				const xStart = s * spanWidth;
				const xEnd = (s + 1) * spanWidth;
				const xMid = (xStart + xEnd) / 2;
				pathD += ' Q ' + xMid.toFixed(1) + ' 24, ' + xEnd.toFixed(1) + ' 4';
			}
			const path = document.createElementNS(GARLAND_SVG_NS, 'path');
			path.setAttribute('d', pathD);
			svg.append(path);
			const fragment = document.createDocumentFragment();
			fragment.append(svg);
			const bulbs = [];
			const bulbPositions = [];
			for (let i = 0; i < bulbCount; i++) {
				const x = (i + 0.5) * step;
				const spanLocal = x % spanWidth / spanWidth;
				// Парабола провисания провода в точке x
				const wireY = 3 + 4 * 10.5 * spanLocal * (1 - spanLocal);
				const tilt = (spanLocal - 0.5) * 18;
				const color = colors[i % colors.length];
				const bulb = document.createElement('span');
				bulb.className = 'ny-fx-bulb';
				bulb.style.left = x.toFixed(1) + 'px';
				bulb.style.top = (wireY + 1).toFixed(1) + 'px';
				bulb.style.setProperty('--ny-bulb-color', color);
				bulb.style.setProperty('--ny-bulb-tilt', tilt.toFixed(1) + 'deg');
				let delayMs = 0;
				if (mode === 'wave') {
					delayMs = Math.round(i / bulbCount * speedMs);
				} else if (mode === 'chase') {
					delayMs = i % 3 * Math.round(speedMs / 3);
				} else if (mode === 'sparkle') {
					delayMs = Math.round(i * 7919 % 100 / 100 * speedMs);
				} else {
					delayMs = i % 4 * Math.round(speedMs * 0.25);
				}
				bulb.style.setProperty('--ny-bulb-delay', '-' + delayMs + 'ms');
				const cap = document.createElement('span');
				cap.className = 'ny-fx-bulb__cap';
				const glass = document.createElement('span');
				glass.className = 'ny-fx-bulb__glass';
				const halo = document.createElement('span');
				halo.className = 'ny-fx-bulb__halo';
				bulb.append(cap, halo, glass);
				fragment.append(bulb);
				bulbs.push(bulb);
				bulbPositions.push({
					x,
					y: wireY + 10
				});
			}
			instance.container.textContent = '';
			instance.container.append(fragment);
			instance.bulbs = bulbs;
			instance.bulbPositions = bulbPositions;
		}
		handleHover(instance, event) {
			if (this.staticOnly || shouldPauseGarland(this.documentPaused, instance.isIntersecting)) {
				return;
			}
			const now = performance.now();
			if (now - instance.lastHoverTime < 60) {
				return;
			}
			instance.lastHoverTime = now;
			const rect = instance.container.getBoundingClientRect();
			const relY = event.clientY - rect.top;
			if (relY < -10 || relY > 52) {
				return;
			}
			const relX = event.clientX - rect.left;
			let closestIdx = -1;
			let closestDist = 30;
			for (let i = 0; i < instance.bulbPositions.length; i++) {
				const dist = Math.abs(instance.bulbPositions[i].x - relX);
				if (dist < closestDist) {
					closestDist = dist;
					closestIdx = i;
				}
			}
			if (closestIdx >= 0) {
				const bulb = instance.bulbs[closestIdx];
				if (bulb && !bulb.classList.contains('ny-fx-bulb--ping')) {
					bulb.classList.add('ny-fx-bulb--ping');
					setTimeout(() => bulb.classList.remove('ny-fx-bulb--ping'), 650);
				}
			}
		}
		syncPointerInteraction(instance) {
			const shouldListen = Boolean(this.config.interactive) && !this.staticOnly;
			if (shouldListen && !instance.onPointerMove) {
				instance.onPointerMove = event => this.handleHover(instance, event);
				instance.target.addEventListener('pointermove', instance.onPointerMove, {
					passive: true
				});
				return;
			}
			if (!shouldListen && instance.onPointerMove) {
				instance.target.removeEventListener('pointermove', instance.onPointerMove);
				instance.onPointerMove = null;
				instance.bulbs.forEach(bulb => bulb.classList.remove('ny-fx-bulb--ping'));
			}
		}
		syncPausedState(instance) {
			instance.container.classList.toggle('ny-fx-garland--paused', shouldPauseGarland(this.documentPaused, instance.isIntersecting));
		}
		setStaticOnly(staticOnly) {
			this.staticOnly = Boolean(staticOnly);
			const targetMode = this.staticOnly ? 'steady' : VALID_MODES.has(this.config.mode) ? this.config.mode : 'twinkle';
			this.instances.forEach(inst => {
				VALID_MODES.forEach(m => inst.container.classList.remove('ny-fx-garland--mode-' + m));
				inst.container.classList.add('ny-fx-garland--mode-' + targetMode);
				this.syncPointerInteraction(inst);
			});
		}
		pause() {
			this.documentPaused = true;
			this.instances.forEach(inst => this.syncPausedState(inst));
		}
		resume() {
			this.documentPaused = false;
			this.instances.forEach(inst => this.syncPausedState(inst));
		}
		destroy() {
			if (this.intersectionObserver) {
				this.intersectionObserver.disconnect();
				this.intersectionObserver = null;
			}
			this.instances.forEach(inst => {
				clearTimeout(inst.resizeTimer);
				if (inst.resizeObserver) {
					inst.resizeObserver.disconnect();
				}
				if (inst.onPointerMove) {
					inst.target.removeEventListener('pointermove', inst.onPointerMove);
				}
				if (inst.container.parentNode) {
					inst.container.parentNode.removeChild(inst.container);
				}
				delete inst.target.dataset.nyFxGarland;
				if (inst.modifiedPosition) {
					inst.target.style.position = '';
				}
			});
			this.instances = [];
			this.documentPaused = false;
		}
	}

	const ORNAMENT_SVGS = {
		hat: `<svg viewBox="0 0 64 56" fill="none" aria-hidden="true">
		<defs>
			<linearGradient id="nyHatRed" x1="10" y1="6" x2="48" y2="44" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stop-color="#ff4d4f"/>
				<stop offset="65%" stop-color="#cf1322"/>
				<stop offset="100%" stop-color="#820014"/>
			</linearGradient>
			<linearGradient id="nyHatFur" x1="0" y1="36" x2="0" y2="52" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stop-color="#ffffff"/>
				<stop offset="100%" stop-color="#e2e8f0"/>
			</linearGradient>
		</defs>
		<path d="M12 40 C14 17 29 5 46 11 C53 13.5 57 20 55 26 C49 23 44 25 46 40 Z" fill="url(#nyHatRed)"/>
		<path d="M18 35 C20 20 30 11 41 13" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round"/>
		<circle cx="55" cy="24" r="6.5" fill="url(#nyHatFur)"/>
		<rect x="6" y="36" width="46" height="13" rx="6.5" fill="url(#nyHatFur)"/>
		<circle cx="13" cy="42.5" r="5" fill="#ffffff"/>
		<circle cx="25" cy="43" r="5.2" fill="#ffffff"/>
		<circle cx="38" cy="42.5" r="5" fill="#ffffff"/>
		<circle cx="47" cy="42.5" r="4.5" fill="#ffffff"/>
	</svg>`,
		ball: `<svg viewBox="0 0 56 64" fill="none" aria-hidden="true">
		<defs>
			<radialGradient id="nyBallBody" cx="35%" cy="30%" r="70%">
				<stop offset="0%" stop-color="#ff7875"/>
				<stop offset="45%" stop-color="#e11d48"/>
				<stop offset="100%" stop-color="#881337"/>
			</radialGradient>
			<linearGradient id="nyBallCap" x1="20" y1="6" x2="36" y2="16" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stop-color="#fef08a"/>
				<stop offset="100%" stop-color="#ca8a04"/>
			</linearGradient>
		</defs>
		<circle cx="28" cy="6" r="4" stroke="#eab308" stroke-width="2.2"/>
		<rect x="21" y="9" width="14" height="8" rx="2.5" fill="url(#nyBallCap)"/>
		<circle cx="28" cy="38" r="22" fill="url(#nyBallBody)"/>
		<ellipse cx="20" cy="29" rx="5.5" ry="9" transform="rotate(-24 20 29)" fill="rgba(255,255,255,0.34)"/>
		<path d="M28 29 V47 M20 38 H36 M22.5 32.5 L33.5 43.5 M33.5 32.5 L22.5 43.5" stroke="rgba(255,241,242,0.55)" stroke-width="1.6" stroke-linecap="round"/>
	</svg>`,
		star: `<svg viewBox="0 0 60 60" fill="none" aria-hidden="true">
		<defs>
			<linearGradient id="nyStarGold" x1="8" y1="6" x2="52" y2="54" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stop-color="#fffbeb"/>
				<stop offset="40%" stop-color="#fde047"/>
				<stop offset="100%" stop-color="#d97706"/>
			</linearGradient>
		</defs>
		<path d="M30 4 L36.6 20.6 L54.5 22 L40.8 33.6 L45.1 51.2 L30 41.7 L14.9 51.2 L19.2 33.6 L5.5 22 L23.4 20.6 Z" fill="url(#nyStarGold)"/>
		<path d="M30 11 L34 23 L45 24 L36 31.5 L39 42.5 L30 36.5 L21 42.5 L24 31.5 L15 24 L26 23 Z" fill="rgba(255,255,255,0.38)"/>
	</svg>`,
		candy: `<svg viewBox="0 0 56 64" fill="none" aria-hidden="true">
		<path d="M34 56 V22 C34 12 20 12 20 21 C20 24 22 26 24 26" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
		<path d="M34 56 V22 C34 12 20 12 20 21 C20 24 22 26 24 26" stroke="#ef4444" stroke-width="10" stroke-linecap="round" stroke-dasharray="6 7"/>
		<path d="M31 54 V22 C31 15 23 15 23 20" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-linecap="round"/>
		<path d="M27 33 L18 28 L20 37 Z M41 33 L50 28 L48 37 Z" fill="#dc2626"/>
		<circle cx="34" cy="33" r="4" fill="#b91c1c"/>
	</svg>`,
		wreath: `<svg viewBox="0 0 60 60" fill="none" aria-hidden="true">
		<circle cx="30" cy="30" r="19" stroke="#15803d" stroke-width="11"/>
		<circle cx="30" cy="30" r="19" stroke="#22c55e" stroke-width="6" stroke-dasharray="5 4"/>
		<circle cx="30" cy="30" r="15" stroke="#14532d" stroke-width="2" stroke-dasharray="3 5"/>
		<circle cx="15" cy="24" r="2.8" fill="#ef4444"/>
		<circle cx="45" cy="24" r="2.8" fill="#ef4444"/>
		<circle cx="18" cy="41" r="2.8" fill="#facc15"/>
		<circle cx="42" cy="41" r="2.8" fill="#facc15"/>
		<circle cx="30" cy="49" r="3" fill="#ef4444"/>
		<path d="M30 13 L21 7 L23 17 Z M30 13 L39 7 L37 17 Z" fill="#dc2626"/>
		<path d="M28 15 L24 24 M32 15 L36 24" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
		<circle cx="30" cy="13" r="3.4" fill="#ef4444"/>
	</svg>`,
		bell: `<svg viewBox="0 0 64 60" fill="none" aria-hidden="true">
		<defs>
			<linearGradient id="nyBellGold" x1="12" y1="14" x2="48" y2="52" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stop-color="#fef9c3"/>
				<stop offset="50%" stop-color="#facc15"/>
				<stop offset="100%" stop-color="#b45309"/>
			</linearGradient>
		</defs>
		<path d="M16 14 C22 6 30 9 32 16 C25 18 20 19 16 14 Z" fill="#16a34a"/>
		<path d="M48 14 C42 6 34 9 32 16 C39 18 44 19 48 14 Z" fill="#15803d"/>
		<path d="M26 18 C16 20 11 30 9 43 L34 49 C35 36 33 24 26 18 Z" fill="url(#nyBellGold)"/>
		<path d="M38 18 C48 20 53 30 55 43 L30 49 C29 36 31 24 38 18 Z" fill="url(#nyBellGold)"/>
		<circle cx="20" cy="47" r="4" fill="#d97706"/>
		<circle cx="44" cy="47" r="4" fill="#d97706"/>
		<circle cx="32" cy="16" r="3.6" fill="#ef4444"/>
	</svg>`,
		snowflake: `<svg viewBox="0 0 60 60" fill="none" aria-hidden="true">
		<defs>
			<linearGradient id="nyIceGrad" x1="8" y1="8" x2="52" y2="52" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stop-color="#ffffff"/>
				<stop offset="55%" stop-color="#7dd3fc"/>
				<stop offset="100%" stop-color="#38bdf8"/>
			</linearGradient>
		</defs>
		<g stroke="url(#nyIceGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
			<path d="M30 6 V54 M9.2 18 L50.8 42 M50.8 18 L9.2 42"/>
			<path d="M24 12 L30 17 L36 12 M24 48 L30 43 L36 48"/>
			<path d="M14 25 L19 23.5 L17.5 18.5 M46 35 L41 36.5 L42.5 41.5"/>
			<path d="M46 25 L41 23.5 L42.5 18.5 M14 35 L19 36.5 L17.5 41.5"/>
		</g>
		<circle cx="30" cy="30" r="4.5" fill="#ffffff"/>
	</svg>`
	};
	const VALID_POSITIONS = new Set(['top-right', 'top-left', 'top-center']);
	const VALID_SIZES = new Set(['sm', 'md', 'lg']);
	class DecorationsManager {
		constructor(config, rootNode) {
			this.config = config || {};
			this.rootNode = rootNode || document;
			this.mounted = [];
			this.uidCounter = 0;
		}
		mount(staticOnly = false) {
			this.destroy();
			if (!this.config.enabled) {
				return;
			}
			const selector = typeof this.config.selector === 'string' && this.config.selector.trim() ? this.config.selector.trim() : '.logo, #logo, .site-logo';
			let targets = [];
			try {
				targets = Array.from(this.rootNode.querySelectorAll(selector));
			} catch (e) {
				return;
			}
			const type = ORNAMENT_SVGS[this.config.type] ? this.config.type : 'hat';
			const position = VALID_POSITIONS.has(this.config.position) ? this.config.position : 'top-right';
			const size = VALID_SIZES.has(this.config.size) ? this.config.size : 'md';
			targets.slice(0, 12).forEach(target => {
				if (target.dataset.nyFxDecorated === '1') {
					return;
				}
				let modifiedPosition = false;
				const computedPos = window.getComputedStyle(target).position;
				if (computedPos === 'static') {
					target.style.position = 'relative';
					modifiedPosition = true;
				}
				const ornament = document.createElement('span');
				ornament.className = ['ny-fx-ornament', 'ny-fx-ornament--' + type, 'ny-fx-ornament--pos-' + position, 'ny-fx-ornament--size-' + size, staticOnly ? 'ny-fx-ornament--static' : ''].filter(Boolean).join(' ');
				ornament.setAttribute('aria-hidden', 'true');
				const uid = '_ny' + ++this.uidCounter;
				const uniqueSvg = ORNAMENT_SVGS[type].replace(/id="(ny[^"]+)"/g, 'id="$1' + uid + '"').replace(/url\(#(ny[^)]+)\)/g, 'url(#$1' + uid + ')');
				ornament.innerHTML = uniqueSvg;
				target.dataset.nyFxDecorated = '1';
				target.append(ornament);
				this.mounted.push({
					target,
					ornament,
					modifiedPosition
				});
			});
		}
		setStaticOnly(staticOnly) {
			this.mounted.forEach(({
				ornament
			}) => {
				ornament.classList.toggle('ny-fx-ornament--static', Boolean(staticOnly));
			});
		}
		destroy() {
			this.mounted.forEach(({
				target,
				ornament,
				modifiedPosition
			}) => {
				if (ornament.parentNode) {
					ornament.parentNode.removeChild(ornament);
				}
				delete target.dataset.nyFxDecorated;
				if (modifiedPosition) {
					target.style.position = '';
				}
			});
			this.mounted = [];
		}
	}

	const FROST_SVG_NS = 'http://www.w3.org/2000/svg';
	function createCornerSvg() {
		const svg = document.createElementNS(FROST_SVG_NS, 'svg');
		svg.setAttribute('viewBox', '0 0 180 180');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('aria-hidden', 'true');
		const defs = document.createElementNS(FROST_SVG_NS, 'defs');
		const grad = document.createElementNS(FROST_SVG_NS, 'radialGradient');
		const gradId = 'ny-frost-g-' + Math.random().toString(36).slice(2, 8);
		grad.setAttribute('id', gradId);
		grad.setAttribute('cx', '0%');
		grad.setAttribute('cy', '0%');
		grad.setAttribute('r', '95%');
		const stop1 = document.createElementNS(FROST_SVG_NS, 'stop');
		stop1.setAttribute('offset', '0%');
		stop1.setAttribute('stop-color', '#e0f2fe');
		stop1.setAttribute('stop-opacity', '0.78');
		const stop2 = document.createElementNS(FROST_SVG_NS, 'stop');
		stop2.setAttribute('offset', '55%');
		stop2.setAttribute('stop-color', '#bae6fd');
		stop2.setAttribute('stop-opacity', '0.26');
		const stop3 = document.createElementNS(FROST_SVG_NS, 'stop');
		stop3.setAttribute('offset', '100%');
		stop3.setAttribute('stop-color', '#ffffff');
		stop3.setAttribute('stop-opacity', '0');
		grad.append(stop1, stop2, stop3);
		defs.append(grad);
		svg.append(defs);
		const glow = document.createElementNS(FROST_SVG_NS, 'path');
		glow.setAttribute('d', 'M0 0 H175 C115 10 65 40 38 92 C22 122 10 150 0 175 Z');
		glow.setAttribute('fill', 'url(#' + gradId + ')');
		svg.append(glow);
		const branches = ['M0 0 C28 18 58 26 98 20', 'M28 15 L44 6 M54 22 L72 10 M74 22 L88 30', 'M0 0 C18 30 26 62 18 102', 'M15 32 L6 48 M21 56 L10 74 M21 76 L32 88', 'M0 0 C32 32 54 58 76 86', 'M30 30 L52 28 M30 30 L28 52 M52 54 L70 50 M52 54 L48 72'];
		branches.forEach((d, idx) => {
			const path = document.createElementNS(FROST_SVG_NS, 'path');
			path.setAttribute('d', d);
			path.setAttribute('stroke', '#ffffff');
			path.setAttribute('stroke-opacity', idx % 2 === 0 ? '0.68' : '0.45');
			path.setAttribute('stroke-width', idx % 2 === 0 ? '1.6' : '1.1');
			path.setAttribute('stroke-linecap', 'round');
			svg.append(path);
		});
		return svg;
	}
	class FrostOverlay {
		constructor(config, mountTarget) {
			this.config = config || {};
			this.mountTarget = mountTarget || document.body;
			this.isScoped = this.mountTarget !== document.body;
			this.container = null;
		}
		mount() {
			if (!this.config.enabled) {
				return;
			}
			this.destroy();
			const container = document.createElement('div');
			container.className = 'ny-fx-frost' + (this.isScoped ? ' ny-fx-frost--scoped' : '');
			container.setAttribute('aria-hidden', 'true');
			const opacity = Math.max(0.1, Math.min(0.8, (Number(this.config.opacity) || 35) / 100));
			container.style.setProperty('--ny-frost-opacity', String(opacity));
			['tl', 'tr', 'bl', 'br'].forEach(pos => {
				const corner = document.createElement('div');
				corner.className = 'ny-fx-frost__corner ny-fx-frost__corner--' + pos;
				corner.append(createCornerSvg());
				container.append(corner);
			});
			this.mountTarget.append(container);
			this.container = container;
		}
		destroy() {
			if (this.container && this.container.parentNode) {
				this.container.parentNode.removeChild(this.container);
			}
			this.container = null;
		}
	}

	const DEFAULT_MESSAGES = {
		NEWYEAR_EFFECTS_WIDGET_COUNTDOWN_PREFIX: 'До Нового года',
		NEWYEAR_EFFECTS_WIDGET_DAYS_SHORT: 'д',
		NEWYEAR_EFFECTS_WIDGET_HAPPY_NEW_YEAR: 'С Новым #YEAR# годом!',
		NEWYEAR_EFFECTS_WIDGET_TOGGLE_OFF: 'Выключить новогодние эффекты',
		NEWYEAR_EFFECTS_WIDGET_TOGGLE_ON: 'Включить новогодние эффекты',
		NEWYEAR_EFFECTS_WIDGET_CELEBRATE: 'Запустить праздничный салют',
		NEWYEAR_EFFECTS_WIDGET_DISABLED_LABEL: 'Эффекты выкл.',
		NEWYEAR_EFFECTS_WIDGET_ENABLED_LABEL: 'Праздник вкл.'
	};
	function getPhrase(code, replacements) {
		let phrase = '';
		if (typeof window.BX !== 'undefined' && window.BX.Loc && typeof window.BX.Loc.getMessage === 'function') {
			phrase = window.BX.Loc.getMessage(code) || '';
		} else if (typeof window.BX !== 'undefined' && typeof window.BX.message === 'function') {
			phrase = window.BX.message(code) || '';
		}
		if (!phrase) {
			phrase = DEFAULT_MESSAGES[code] || code;
		}
		if (replacements && typeof replacements === 'object') {
			Object.keys(replacements).forEach(key => {
				phrase = phrase.replace(key, String(replacements[key]));
			});
		}
		return phrase;
	}
	function pad2(n) {
		return n < 10 ? '0' + n : String(n);
	}
	function buildCountdownAriaLabel(prefix, countdown, action, includePrefix = true) {
		const normalizedPrefix = typeof prefix === 'string' ? prefix.trim() : '';
		const normalizedCountdown = typeof countdown === 'string' ? countdown.trim() : '';
		const normalizedAction = typeof action === 'string' ? action.trim() : '';
		const status = includePrefix && normalizedPrefix ? normalizedPrefix + ': ' + normalizedCountdown : normalizedCountdown;
		if (!status) {
			return normalizedAction;
		}
		if (!normalizedAction) {
			return status;
		}
		return status + (/[.!?]$/.test(status) ? ' ' : '. ') + normalizedAction;
	}
	class FestiveWidget {
		constructor(config, callbacks, mountTarget) {
			this.config = config || {};
			this.callbacks = callbacks || {};
			this.mountTarget = mountTarget || document.body;
			this.isScoped = this.mountTarget !== document.body;
			this.root = null;
			this.countdownEl = null;
			this.celebrateBtn = null;
			this.toggleBtn = null;
			this.timerId = 0;
			this.userDisabled = Boolean(callbacks.initialDisabled);
			this.celebratedMidnight = false;
			this.staticOnly = false;
		}
		mount() {
			this.destroy();
			const mode = this.config.mode || 'countdown';
			if (mode === 'hidden') {
				return;
			}
			const pos = this.config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
			const root = document.createElement('div');
			root.className = ['ny-fx-widget', 'ny-fx-widget--' + pos, this.isScoped ? 'ny-fx-widget--scoped' : '', this.userDisabled ? 'ny-fx-widget--muted' : '', this.staticOnly ? 'ny-fx-widget--static' : ''].filter(Boolean).join(' ');
			if (mode === 'countdown') {
				const celebrateBtn = document.createElement('button');
				celebrateBtn.type = 'button';
				celebrateBtn.className = 'ny-fx-widget__countdown';
				celebrateBtn.title = getPhrase('NEWYEAR_EFFECTS_WIDGET_CELEBRATE');
				celebrateBtn.setAttribute('aria-label', celebrateBtn.title);
				this.celebrateBtn = celebrateBtn;
				const icon = document.createElement('span');
				icon.className = 'ny-fx-widget__icon';
				icon.setAttribute('aria-hidden', 'true');
				icon.textContent = '🎄';
				const text = document.createElement('span');
				text.className = 'ny-fx-widget__text';
				this.countdownEl = text;
				celebrateBtn.append(icon, text);
				celebrateBtn.addEventListener('click', event => {
					if (typeof this.callbacks.onCelebrate === 'function') {
						const rect = celebrateBtn.getBoundingClientRect();
						let cx = rect.left + rect.width / 2;
						let cy = rect.top;
						if (this.isScoped) {
							const hostRect = this.mountTarget.getBoundingClientRect();
							cx -= hostRect.left;
							cy -= hostRect.top;
						}
						this.callbacks.onCelebrate(cx, cy);
					}
					event.stopPropagation();
				});
				root.append(celebrateBtn);
			}
			const toggleBtn = document.createElement('button');
			toggleBtn.type = 'button';
			toggleBtn.className = 'ny-fx-widget__toggle';
			this.toggleBtn = toggleBtn;
			this.syncToggleState();
			toggleBtn.addEventListener('click', event => {
				event.stopPropagation();
				this.userDisabled = !this.userDisabled;
				this.syncToggleState();
				if (typeof this.callbacks.onToggle === 'function') {
					this.callbacks.onToggle(!this.userDisabled);
				}
			});
			root.append(toggleBtn);
			this.mountTarget.append(root);
			this.root = root;
			if (mode === 'countdown') {
				this.updateCountdown();
				this.timerId = window.setInterval(() => {
					if (!document.hidden) {
						this.updateCountdown();
					}
				}, 1000);
			}
		}
		syncToggleState() {
			if (!this.toggleBtn) {
				return;
			}
			const isOnlyToggle = (this.config.mode || 'countdown') === 'toggle';
			this.toggleBtn.setAttribute('aria-pressed', String(!this.userDisabled));
			this.toggleBtn.title = this.userDisabled ? getPhrase('NEWYEAR_EFFECTS_WIDGET_TOGGLE_ON') : getPhrase('NEWYEAR_EFFECTS_WIDGET_TOGGLE_OFF');
			this.toggleBtn.setAttribute('aria-label', this.toggleBtn.title);
			if (isOnlyToggle) {
				this.toggleBtn.textContent = this.userDisabled ? '❄️ ' + getPhrase('NEWYEAR_EFFECTS_WIDGET_DISABLED_LABEL') : '✨ ' + getPhrase('NEWYEAR_EFFECTS_WIDGET_ENABLED_LABEL');
			} else {
				this.toggleBtn.textContent = this.userDisabled ? 'Off' : '❄';
			}
			if (this.root) {
				this.root.classList.toggle('ny-fx-widget--muted', this.userDisabled);
			}
		}
		setStaticOnly(staticOnly) {
			this.staticOnly = Boolean(staticOnly);
			if (this.root) {
				this.root.classList.toggle('ny-fx-widget--static', this.staticOnly);
			}
		}
		syncCountdownLabel(includePrefix) {
			if (!this.celebrateBtn || !this.countdownEl) {
				return;
			}
			this.celebrateBtn.setAttribute('aria-label', buildCountdownAriaLabel(getPhrase('NEWYEAR_EFFECTS_WIDGET_COUNTDOWN_PREFIX'), this.countdownEl.textContent || '', getPhrase('NEWYEAR_EFFECTS_WIDGET_CELEBRATE'), includePrefix));
		}
		updateCountdown() {
			if (!this.countdownEl) {
				return;
			}
			const now = new Date();
			const month = now.getMonth(); // 0 = January
			const day = now.getDate();

			// С 1 по 14 января показываем праздничное поздравление
			if (month === 0 && day <= 14) {
				this.countdownEl.textContent = getPhrase('NEWYEAR_EFFECTS_WIDGET_HAPPY_NEW_YEAR', {
					'#YEAR#': now.getFullYear()
				});
				this.syncCountdownLabel(false);
				if (!this.celebratedMidnight && day === 1 && now.getHours() === 0 && now.getMinutes() < 2) {
					this.celebratedMidnight = true;
					if (typeof this.callbacks.onCelebrate === 'function') {
						this.callbacks.onCelebrate();
					}
				}
				return;
			}
			const nextYear = now.getFullYear() + 1;
			const target = new Date(nextYear, 0, 1, 0, 0, 0);
			const diffSec = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
			const days = Math.floor(diffSec / 86400);
			const hours = Math.floor(diffSec % 86400 / 3600);
			const mins = Math.floor(diffSec % 3600 / 60);
			const secs = diffSec % 60;
			const dayUnit = getPhrase('NEWYEAR_EFFECTS_WIDGET_DAYS_SHORT');
			if (days > 0) {
				this.countdownEl.textContent = days + dayUnit + ' ' + pad2(hours) + ':' + pad2(mins) + ':' + pad2(secs);
			} else {
				this.countdownEl.textContent = pad2(hours) + ':' + pad2(mins) + ':' + pad2(secs);
			}
			this.syncCountdownLabel(true);
		}
		destroy() {
			if (this.timerId) {
				window.clearInterval(this.timerId);
				this.timerId = 0;
			}
			if (this.root && this.root.parentNode) {
				this.root.parentNode.removeChild(this.root);
			}
			this.root = null;
			this.countdownEl = null;
			this.celebrateBtn = null;
			this.toggleBtn = null;
		}
	}

	const STORAGE_KEY = 'newyear_effects_user_disabled';
	function readUserPreference() {
		try {
			return window.localStorage.getItem(STORAGE_KEY) === '1';
		} catch (e) {
			return false;
		}
	}
	function writeUserPreference(disabled) {
		try {
			if (disabled) {
				window.localStorage.setItem(STORAGE_KEY, '1');
			} else {
				window.localStorage.removeItem(STORAGE_KEY);
			}
		} catch (e) {
			// Игнорируем ограничения приватного режима браузера
		}
	}
	function readPageConfig() {
		const jsonNode = document.getElementById('newyear-effects-config');
		if (jsonNode && jsonNode.textContent) {
			try {
				return JSON.parse(jsonNode.textContent);
			} catch (e) {
				return null;
			}
		}
		return null;
	}
	class NewyearEffectsEngine {
		constructor(config, options = {}) {
			this.config = config || {};
			this.mountTarget = options.mountTarget || document.body;
			this.rootNode = options.rootNode || (this.mountTarget === document.body ? document : this.mountTarget);
			this.ignoreUserPreference = Boolean(options.ignoreUserPreference);
			this.userDisabled = this.ignoreUserPreference ? false : readUserPreference();
			this.governor = null;
			this.snow = null;
			this.garland = null;
			this.decorations = null;
			this.frost = null;
			this.widget = null;
			this.onVisibilityChange = this.handleVisibilityChange.bind(this);
		}
		start() {
			this.destroy();
			this.governor = new PerformanceGovernor(this.config.performance || {}, profile => {
				if (this.snow) {
					this.snow.applyProfile(profile);
				}
				if (this.garland) {
					this.garland.setStaticOnly(profile.garlandStaticOnly);
				}
				if (this.decorations) {
					this.decorations.setStaticOnly(profile.garlandStaticOnly);
				}
				if (this.widget) {
					this.widget.setStaticOnly(!profileAllowsMotion(profile));
				}
			});
			const profile = this.governor.getProfile();
			if (profile.name === 'off') {
				return this;
			}
			this.widget = new FestiveWidget(this.config.widget || {}, {
				initialDisabled: this.userDisabled,
				onToggle: enabled => {
					this.userDisabled = !enabled;
					if (!this.ignoreUserPreference) {
						writeUserPreference(this.userDisabled);
					}
					if (this.userDisabled) {
						this.teardownEffects();
					} else {
						this.mountEffects();
					}
				},
				onCelebrate: (x, y) => this.celebrate(x, y)
			}, this.mountTarget);
			this.widget.mount();
			this.widget.setStaticOnly(!profileAllowsMotion(profile));
			if (!this.userDisabled) {
				this.mountEffects();
			}
			document.addEventListener('visibilitychange', this.onVisibilityChange);
			this.handleVisibilityChange();
			return this;
		}
		mountEffects() {
			this.teardownEffects();
			const profile = this.governor ? this.governor.getProfile() : {
				garlandStaticOnly: false
			};
			this.frost = new FrostOverlay(this.config.frost || {}, this.mountTarget);
			this.frost.mount();
			this.snow = new SnowCanvasEngine(this.config, this.governor, this.mountTarget);
			this.snow.mount();
			this.garland = new GarlandManager(this.config.garland || {}, this.rootNode);
			this.garland.mount(profile.garlandStaticOnly);
			this.decorations = new DecorationsManager(this.config.decorations || {}, this.rootNode);
			this.decorations.mount(profile.garlandStaticOnly);
		}
		teardownEffects() {
			if (this.snow) {
				this.snow.destroy();
				this.snow = null;
			}
			if (this.garland) {
				this.garland.destroy();
				this.garland = null;
			}
			if (this.decorations) {
				this.decorations.destroy();
				this.decorations = null;
			}
			if (this.frost) {
				this.frost.destroy();
				this.frost = null;
			}
		}
		updateConfig(nextConfig) {
			this.config = nextConfig || {};
			return this.start();
		}
		handleVisibilityChange() {
			if (document.hidden) {
				this.pause();
			} else {
				this.resume();
			}
		}
		pause() {
			if (this.snow) {
				this.snow.pause();
			}
			if (this.garland) {
				this.garland.pause();
			}
		}
		resume() {
			if (this.userDisabled) {
				return;
			}
			if (this.snow) {
				this.snow.resume();
			}
			if (this.garland) {
				this.garland.resume();
			}
		}
		celebrate(x, y) {
			const profile = this.governor ? this.governor.getProfile() : null;
			if (this.userDisabled || !profileAllowsMotion(profile)) {
				return;
			}
			if (!this.snow && this.governor) {
				this.snow = new SnowCanvasEngine(this.config, this.governor, this.mountTarget);
				this.snow.mount();
			}
			if (this.snow) {
				this.snow.celebrate(x, y);
			}
		}
		getPerformanceInfo() {
			return this.governor ? this.governor.getStats() : {
				tier: 'off',
				fps: 0,
				auto: false
			};
		}
		destroy() {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
			this.teardownEffects();
			if (this.widget) {
				this.widget.destroy();
				this.widget = null;
			}
			if (this.governor) {
				this.governor.destroy();
				this.governor = null;
			}
		}
	}
	let activeInstance = null;
	function getInstance() {
		return activeInstance;
	}
	function celebrate(x, y) {
		if (activeInstance) {
			activeInstance.celebrate(x, y);
		}
	}
	function bootstrap() {
		const config = readPageConfig();
		if (!config) {
			return null;
		}
		if (activeInstance) {
			activeInstance.destroy();
		}
		activeInstance = new NewyearEffectsEngine(config).start();
		return activeInstance;
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bootstrap, {
			once: true
		});
	} else {
		bootstrap();
	}

	exports.NewyearEffectsEngine = NewyearEffectsEngine;
	exports.bootstrap = bootstrap;
	exports.celebrate = celebrate;
	exports.getInstance = getInstance;

})(this.BX.Newyear.Effects.Engine = this.BX.Newyear.Effects.Engine || {});
