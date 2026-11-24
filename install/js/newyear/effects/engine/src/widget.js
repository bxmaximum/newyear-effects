const DEFAULT_MESSAGES = {
	NEWYEAR_EFFECTS_WIDGET_COUNTDOWN_PREFIX: 'До Нового года',
	NEWYEAR_EFFECTS_WIDGET_DAYS_SHORT: 'д',
	NEWYEAR_EFFECTS_WIDGET_HAPPY_NEW_YEAR: 'С Новым #YEAR# годом!',
	NEWYEAR_EFFECTS_WIDGET_TOGGLE_OFF: 'Выключить новогодние эффекты',
	NEWYEAR_EFFECTS_WIDGET_TOGGLE_ON: 'Включить новогодние эффекты',
	NEWYEAR_EFFECTS_WIDGET_CELEBRATE: 'Запустить праздничный салют',
	NEWYEAR_EFFECTS_WIDGET_DISABLED_LABEL: 'Эффекты выкл.',
	NEWYEAR_EFFECTS_WIDGET_ENABLED_LABEL: 'Праздник вкл.',
};

function getPhrase(code, replacements)
{
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
		Object.keys(replacements).forEach((key) => {
			phrase = phrase.replace(key, String(replacements[key]));
		});
	}

	return phrase;
}

function pad2(n)
{
	return n < 10 ? '0' + n : String(n);
}

export function buildCountdownAriaLabel(prefix, countdown, action, includePrefix = true)
{
	const normalizedPrefix = typeof prefix === 'string' ? prefix.trim() : '';
	const normalizedCountdown = typeof countdown === 'string' ? countdown.trim() : '';
	const normalizedAction = typeof action === 'string' ? action.trim() : '';
	const status = includePrefix && normalizedPrefix
		? normalizedPrefix + ': ' + normalizedCountdown
		: normalizedCountdown;

	if (!status) {
		return normalizedAction;
	}
	if (!normalizedAction) {
		return status;
	}

	return status + (/[.!?]$/.test(status) ? ' ' : '. ') + normalizedAction;
}

export class FestiveWidget
{
	constructor(config, callbacks, mountTarget)
	{
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

	mount()
	{
		this.destroy();

		const mode = this.config.mode || 'countdown';
		if (mode === 'hidden') {
			return;
		}

		const pos = this.config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
		const root = document.createElement('div');
		root.className = [
			'ny-fx-widget',
			'ny-fx-widget--' + pos,
			this.isScoped ? 'ny-fx-widget--scoped' : '',
			this.userDisabled ? 'ny-fx-widget--muted' : '',
			this.staticOnly ? 'ny-fx-widget--static' : '',
		].filter(Boolean).join(' ');

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
			celebrateBtn.addEventListener('click', (event) => {
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

		toggleBtn.addEventListener('click', (event) => {
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

	syncToggleState()
	{
		if (!this.toggleBtn) {
			return;
		}

		const isOnlyToggle = (this.config.mode || 'countdown') === 'toggle';
		this.toggleBtn.setAttribute('aria-pressed', String(!this.userDisabled));
		this.toggleBtn.title = this.userDisabled
			? getPhrase('NEWYEAR_EFFECTS_WIDGET_TOGGLE_ON')
			: getPhrase('NEWYEAR_EFFECTS_WIDGET_TOGGLE_OFF');
		this.toggleBtn.setAttribute('aria-label', this.toggleBtn.title);

		if (isOnlyToggle) {
			this.toggleBtn.textContent = this.userDisabled
				? '❄️ ' + getPhrase('NEWYEAR_EFFECTS_WIDGET_DISABLED_LABEL')
				: '✨ ' + getPhrase('NEWYEAR_EFFECTS_WIDGET_ENABLED_LABEL');
		} else {
			this.toggleBtn.textContent = this.userDisabled ? 'Off' : '❄';
		}

		if (this.root) {
			this.root.classList.toggle('ny-fx-widget--muted', this.userDisabled);
		}
	}

	setStaticOnly(staticOnly)
	{
		this.staticOnly = Boolean(staticOnly);
		if (this.root) {
			this.root.classList.toggle('ny-fx-widget--static', this.staticOnly);
		}
	}

	syncCountdownLabel(includePrefix)
	{
		if (!this.celebrateBtn || !this.countdownEl) {
			return;
		}

		this.celebrateBtn.setAttribute('aria-label', buildCountdownAriaLabel(
			getPhrase('NEWYEAR_EFFECTS_WIDGET_COUNTDOWN_PREFIX'),
			this.countdownEl.textContent || '',
			getPhrase('NEWYEAR_EFFECTS_WIDGET_CELEBRATE'),
			includePrefix,
		));
	}

	updateCountdown()
	{
		if (!this.countdownEl) {
			return;
		}

		const now = new Date();
		const month = now.getMonth(); // 0 = January
		const day = now.getDate();

		// С 1 по 14 января показываем праздничное поздравление
		if (month === 0 && day <= 14) {
			this.countdownEl.textContent = getPhrase('NEWYEAR_EFFECTS_WIDGET_HAPPY_NEW_YEAR', {
				'#YEAR#': now.getFullYear(),
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
		const hours = Math.floor((diffSec % 86400) / 3600);
		const mins = Math.floor((diffSec % 3600) / 60);
		const secs = diffSec % 60;
		const dayUnit = getPhrase('NEWYEAR_EFFECTS_WIDGET_DAYS_SHORT');

		if (days > 0) {
			this.countdownEl.textContent = days + dayUnit + ' ' + pad2(hours) + ':' + pad2(mins) + ':' + pad2(secs);
		} else {
			this.countdownEl.textContent = pad2(hours) + ':' + pad2(mins) + ':' + pad2(secs);
		}
		this.syncCountdownLabel(true);
	}

	destroy()
	{
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
