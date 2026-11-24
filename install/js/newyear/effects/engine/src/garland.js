const GARLAND_SVG_NS = 'http://www.w3.org/2000/svg';
const VALID_MODES = new Set(['twinkle', 'wave', 'chase', 'sparkle', 'steady']);
const FALLBACK_COLORS = ['#ffd666', '#ffec99', '#ffa940', '#fff1b8', '#ffc53d'];

function sanitizeColors(colors)
{
	if (!Array.isArray(colors)) {
		return FALLBACK_COLORS;
	}

	const valid = colors.filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.trim()));

	return valid.length > 0 ? valid : FALLBACK_COLORS;
}

export function shouldPauseGarland(documentPaused, isIntersecting)
{
	return documentPaused || !isIntersecting;
}

export class GarlandManager
{
	constructor(config, rootNode)
	{
		this.config = config || {};
		this.rootNode = rootNode || document;
		this.instances = [];
		this.intersectionObserver = null;
		this.staticOnly = false;
		this.documentPaused = false;
	}

	mount(staticOnly = false)
	{
		this.destroy();
		this.staticOnly = Boolean(staticOnly);

		if (!this.config.enabled) {
			return;
		}

		const selector = typeof this.config.selector === 'string' && this.config.selector.trim()
			? this.config.selector.trim()
			: 'header, .header, #header';

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
			this.intersectionObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					const inst = this.instances.find((item) => item.container === entry.target);
					if (inst) {
						inst.isIntersecting = entry.isIntersecting;
						this.syncPausedState(inst);
					}
				});
			}, { rootMargin: '60px' });
		}

		targets.slice(0, 6).forEach((target) => {
			this.mountOnElement(target);
		});
	}

	mountOnElement(target)
	{
		if (target.dataset.nyFxGarland === '1') {
			return;
		}

		let modifiedPosition = false;
		if (window.getComputedStyle(target).position === 'static') {
			target.style.position = 'relative';
			modifiedPosition = true;
		}

		const mode = this.staticOnly
			? 'steady'
			: (VALID_MODES.has(this.config.mode) ? this.config.mode : 'twinkle');

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
			isIntersecting: true,
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

	buildStrands(instance)
	{
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
		const mode = this.staticOnly
			? 'steady'
			: (VALID_MODES.has(this.config.mode) ? this.config.mode : 'twinkle');

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
			const spanLocal = ((x % spanWidth) / spanWidth);
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
				delayMs = Math.round((i / bulbCount) * speedMs);
			} else if (mode === 'chase') {
				delayMs = (i % 3) * Math.round(speedMs / 3);
			} else if (mode === 'sparkle') {
				delayMs = Math.round(((i * 7919) % 100) / 100 * speedMs);
			} else {
				delayMs = (i % 4) * Math.round(speedMs * 0.25);
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
			bulbPositions.push({ x, y: wireY + 10 });
		}

		instance.container.textContent = '';
		instance.container.append(fragment);
		instance.bulbs = bulbs;
		instance.bulbPositions = bulbPositions;
	}

	handleHover(instance, event)
	{
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

	syncPointerInteraction(instance)
	{
		const shouldListen = Boolean(this.config.interactive) && !this.staticOnly;
		if (shouldListen && !instance.onPointerMove) {
			instance.onPointerMove = (event) => this.handleHover(instance, event);
			instance.target.addEventListener('pointermove', instance.onPointerMove, { passive: true });

			return;
		}

		if (!shouldListen && instance.onPointerMove) {
			instance.target.removeEventListener('pointermove', instance.onPointerMove);
			instance.onPointerMove = null;
			instance.bulbs.forEach((bulb) => bulb.classList.remove('ny-fx-bulb--ping'));
		}
	}

	syncPausedState(instance)
	{
		instance.container.classList.toggle(
			'ny-fx-garland--paused',
			shouldPauseGarland(this.documentPaused, instance.isIntersecting),
		);
	}

	setStaticOnly(staticOnly)
	{
		this.staticOnly = Boolean(staticOnly);
		const targetMode = this.staticOnly
			? 'steady'
			: (VALID_MODES.has(this.config.mode) ? this.config.mode : 'twinkle');

		this.instances.forEach((inst) => {
			VALID_MODES.forEach((m) => inst.container.classList.remove('ny-fx-garland--mode-' + m));
			inst.container.classList.add('ny-fx-garland--mode-' + targetMode);
			this.syncPointerInteraction(inst);
		});
	}

	pause()
	{
		this.documentPaused = true;
		this.instances.forEach((inst) => this.syncPausedState(inst));
	}

	resume()
	{
		this.documentPaused = false;
		this.instances.forEach((inst) => this.syncPausedState(inst));
	}

	destroy()
	{
		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}

		this.instances.forEach((inst) => {
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
