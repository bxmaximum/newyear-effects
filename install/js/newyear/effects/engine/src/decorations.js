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
	</svg>`,
};

const VALID_POSITIONS = new Set(['top-right', 'top-left', 'top-center']);
const VALID_SIZES = new Set(['sm', 'md', 'lg']);

export class DecorationsManager
{
	constructor(config, rootNode)
	{
		this.config = config || {};
		this.rootNode = rootNode || document;
		this.mounted = [];
		this.uidCounter = 0;
	}

	mount(staticOnly = false)
	{
		this.destroy();

		if (!this.config.enabled) {
			return;
		}

		const selector = typeof this.config.selector === 'string' && this.config.selector.trim()
			? this.config.selector.trim()
			: '.logo, #logo, .site-logo';

		let targets = [];
		try {
			targets = Array.from(this.rootNode.querySelectorAll(selector));
		} catch (e) {
			return;
		}

		const type = ORNAMENT_SVGS[this.config.type] ? this.config.type : 'hat';
		const position = VALID_POSITIONS.has(this.config.position) ? this.config.position : 'top-right';
		const size = VALID_SIZES.has(this.config.size) ? this.config.size : 'md';

		targets.slice(0, 12).forEach((target) => {
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
			ornament.className = [
				'ny-fx-ornament',
				'ny-fx-ornament--' + type,
				'ny-fx-ornament--pos-' + position,
				'ny-fx-ornament--size-' + size,
				staticOnly ? 'ny-fx-ornament--static' : '',
			].filter(Boolean).join(' ');
			ornament.setAttribute('aria-hidden', 'true');
			const uid = '_ny' + (++this.uidCounter);
			const uniqueSvg = ORNAMENT_SVGS[type]
				.replace(/id="(ny[^"]+)"/g, 'id="$1' + uid + '"')
				.replace(/url\(#(ny[^)]+)\)/g, 'url(#$1' + uid + ')');
			ornament.innerHTML = uniqueSvg;

			target.dataset.nyFxDecorated = '1';
			target.append(ornament);

			this.mounted.push({ target, ornament, modifiedPosition });
		});
	}

	setStaticOnly(staticOnly)
	{
		this.mounted.forEach(({ ornament }) => {
			ornament.classList.toggle('ny-fx-ornament--static', Boolean(staticOnly));
		});
	}

	destroy()
	{
		this.mounted.forEach(({ target, ornament, modifiedPosition }) => {
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
