export const TIER_PROFILES = {
	high: {
		name: 'high',
		maxDpr: 1.5,
		targetFps: 60,
		particleScale: 1.0,
		enableDepth: true,
		enableInteractive: true,
		enableSparkles: true,
		enableRotation: true,
		garlandStaticOnly: false,
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
		garlandStaticOnly: false,
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
		garlandStaticOnly: false,
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
		garlandStaticOnly: true,
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
		garlandStaticOnly: true,
	},
};

const TIER_ORDER = ['high', 'balanced', 'eco', 'static'];

export function isMobileViewport(viewportWidth, hasCoarsePointer)
{
	return viewportWidth < 768 || hasCoarsePointer;
}

export class PerformanceGovernor
{
	constructor(config, onTierChange)
	{
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

	detectInitialTier()
	{
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

	detectHardwareTier()
	{
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

	prefersReducedMotion()
	{
		return typeof window.matchMedia === 'function'
			&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	isMobileViewport()
	{
		const hasCoarsePointer = typeof window.matchMedia === 'function'
			&& window.matchMedia('(pointer: coarse)').matches;

		return isMobileViewport(window.innerWidth, hasCoarsePointer);
	}

	bindReducedMotion()
	{
		if (this.config.respectReducedMotion === false || typeof window.matchMedia !== 'function') {
			return;
		}

		this.motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
		this.onMotionChange = (event) => {
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

	getProfile()
	{
		return TIER_PROFILES[this.tierName] || TIER_PROFILES.eco;
	}

	getStats()
	{
		return {
			tier: this.tierName,
			fps: Math.round(this.lastMeasuredFps),
			auto: this.isAuto,
		};
	}

	recordFrame(deltaMs, now)
	{
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

	stepDown()
	{
		const idx = TIER_ORDER.indexOf(this.tierName);
		if (idx >= 0 && idx < TIER_ORDER.length - 1) {
			this.sampleCount = 0;
			this.sampleIndex = 0;
			this.setTier(TIER_ORDER[idx + 1]);
		}
	}

	setTier(nextTier)
	{
		if (!TIER_PROFILES[nextTier] || nextTier === this.tierName) {
			return;
		}

		this.tierName = nextTier;
		this.onTierChange(this.getProfile());
	}

	destroy()
	{
		if (this.motionMedia && this.onMotionChange && typeof this.motionMedia.removeEventListener === 'function') {
			this.motionMedia.removeEventListener('change', this.onMotionChange);
		}
	}
}
