const FROST_SVG_NS = 'http://www.w3.org/2000/svg';

function createCornerSvg()
{
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

	const branches = [
		'M0 0 C28 18 58 26 98 20',
		'M28 15 L44 6 M54 22 L72 10 M74 22 L88 30',
		'M0 0 C18 30 26 62 18 102',
		'M15 32 L6 48 M21 56 L10 74 M21 76 L32 88',
		'M0 0 C32 32 54 58 76 86',
		'M30 30 L52 28 M30 30 L28 52 M52 54 L70 50 M52 54 L48 72',
	];

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

export class FrostOverlay
{
	constructor(config, mountTarget)
	{
		this.config = config || {};
		this.mountTarget = mountTarget || document.body;
		this.isScoped = this.mountTarget !== document.body;
		this.container = null;
	}

	mount()
	{
		if (!this.config.enabled) {
			return;
		}

		this.destroy();

		const container = document.createElement('div');
		container.className = 'ny-fx-frost' + (this.isScoped ? ' ny-fx-frost--scoped' : '');
		container.setAttribute('aria-hidden', 'true');

		const opacity = Math.max(0.1, Math.min(0.8, (Number(this.config.opacity) || 35) / 100));
		container.style.setProperty('--ny-frost-opacity', String(opacity));

		['tl', 'tr', 'bl', 'br'].forEach((pos) => {
			const corner = document.createElement('div');
			corner.className = 'ny-fx-frost__corner ny-fx-frost__corner--' + pos;
			corner.append(createCornerSvg());
			container.append(corner);
		});

		this.mountTarget.append(container);
		this.container = container;
	}

	destroy()
	{
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}
		this.container = null;
	}
}
