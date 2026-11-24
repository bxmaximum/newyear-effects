import './style.css';
import { PerformanceGovernor } from './performance-governor';
import { profileAllowsMotion, SnowCanvasEngine } from './snow-canvas';
import { GarlandManager } from './garland';
import { DecorationsManager } from './decorations';
import { FrostOverlay } from './frost';
import { FestiveWidget } from './widget';

const STORAGE_KEY = 'newyear_effects_user_disabled';

function readUserPreference()
{
	try {
		return window.localStorage.getItem(STORAGE_KEY) === '1';
	} catch (e) {
		return false;
	}
}

function writeUserPreference(disabled)
{
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

function readPageConfig()
{
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

export class NewyearEffectsEngine
{
	constructor(config, options = {})
	{
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

	start()
	{
		this.destroy();

		this.governor = new PerformanceGovernor(this.config.performance || {}, (profile) => {
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

		this.widget = new FestiveWidget(
			this.config.widget || {},
			{
				initialDisabled: this.userDisabled,
				onToggle: (enabled) => {
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
				onCelebrate: (x, y) => this.celebrate(x, y),
			},
			this.mountTarget,
		);
		this.widget.mount();
		this.widget.setStaticOnly(!profileAllowsMotion(profile));

		if (!this.userDisabled) {
			this.mountEffects();
		}

		document.addEventListener('visibilitychange', this.onVisibilityChange);
		this.handleVisibilityChange();

		return this;
	}

	mountEffects()
	{
		this.teardownEffects();

		const profile = this.governor ? this.governor.getProfile() : { garlandStaticOnly: false };

		this.frost = new FrostOverlay(this.config.frost || {}, this.mountTarget);
		this.frost.mount();

		this.snow = new SnowCanvasEngine(this.config, this.governor, this.mountTarget);
		this.snow.mount();

		this.garland = new GarlandManager(this.config.garland || {}, this.rootNode);
		this.garland.mount(profile.garlandStaticOnly);

		this.decorations = new DecorationsManager(this.config.decorations || {}, this.rootNode);
		this.decorations.mount(profile.garlandStaticOnly);
	}

	teardownEffects()
	{
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

	updateConfig(nextConfig)
	{
		this.config = nextConfig || {};

		return this.start();
	}

	handleVisibilityChange()
	{
		if (document.hidden) {
			this.pause();
		} else {
			this.resume();
		}
	}

	pause()
	{
		if (this.snow) {
			this.snow.pause();
		}
		if (this.garland) {
			this.garland.pause();
		}
	}

	resume()
	{
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

	celebrate(x, y)
	{
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

	getPerformanceInfo()
	{
		return this.governor ? this.governor.getStats() : { tier: 'off', fps: 0, auto: false };
	}

	destroy()
	{
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

export function getInstance()
{
	return activeInstance;
}

export function celebrate(x, y)
{
	if (activeInstance) {
		activeInstance.celebrate(x, y);
	}
}

export function bootstrap()
{
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
	document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
	bootstrap();
}
