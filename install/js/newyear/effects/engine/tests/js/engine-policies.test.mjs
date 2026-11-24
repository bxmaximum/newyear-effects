import assert from 'node:assert/strict';
import test from 'node:test';

import { isMobileViewport, PerformanceGovernor } from '../../src/performance-governor.js';
import { GarlandManager, shouldPauseGarland } from '../../src/garland.js';
import { profileAllowsMotion } from '../../src/snow-canvas.js';
import { buildCountdownAriaLabel } from '../../src/widget.js';

test('coarse pointer devices use the mobile performance profile', () => {
	assert.equal(isMobileViewport(1024, true), true);
	assert.equal(isMobileViewport(767, false), true);
	assert.equal(isMobileViewport(1024, false), false);
});

test('static and off profiles never allow canvas motion', () => {
	assert.equal(profileAllowsMotion({ name: 'static', targetFps: 0 }), false);
	assert.equal(profileAllowsMotion({ name: 'off', targetFps: 60 }), false);
	assert.equal(profileAllowsMotion({ name: 'eco', targetFps: 30 }), true);
});

test('respectReducedMotion=false keeps the configured profile', () => {
	const previousWindow = globalThis.window;
	globalThis.window = {
		innerWidth: 1200,
		matchMedia: (query) => ({
			matches: query === '(prefers-reduced-motion: reduce)',
		}),
	};

	try {
		const governor = new PerformanceGovernor({
			mode: 'high',
			respectReducedMotion: false,
		});
		assert.equal(governor.getProfile().name, 'high');
	} finally {
		globalThis.window = previousWindow;
	}
});

test('static garland detaches pointer interaction and clears ping', () => {
	let attachedHandler = null;
	let removedHandler = null;
	let pingRemoved = false;
	const target = {
		addEventListener: (type, handler) => {
			assert.equal(type, 'pointermove');
			attachedHandler = handler;
		},
		removeEventListener: (type, handler) => {
			assert.equal(type, 'pointermove');
			removedHandler = handler;
		},
	};
	const instance = {
		target,
		onPointerMove: null,
		bulbs: [{
			classList: {
				remove: (className) => {
					assert.equal(className, 'ny-fx-bulb--ping');
					pingRemoved = true;
				},
			},
		}],
	};
	const manager = new GarlandManager({ interactive: true }, {});

	manager.syncPointerInteraction(instance);
	assert.equal(typeof attachedHandler, 'function');
	manager.staticOnly = true;
	manager.syncPointerInteraction(instance);

	assert.equal(removedHandler, attachedHandler);
	assert.equal(instance.onPointerMove, null);
	assert.equal(pingRemoved, true);
});

test('document and viewport pauses remain independent', () => {
	assert.equal(shouldPauseGarland(false, true), false);
	assert.equal(shouldPauseGarland(true, true), true);
	assert.equal(shouldPauseGarland(false, false), true);
	assert.equal(shouldPauseGarland(true, false), true);
});

test('countdown prefix is available to assistive technology only', () => {
	assert.equal(
		buildCountdownAriaLabel(
			'До Нового года',
			'37д 12:34:56',
			'Запустить праздничный салют',
			true,
		),
		'До Нового года: 37д 12:34:56. Запустить праздничный салют',
	);
	assert.equal(
		buildCountdownAriaLabel(
			'До Нового года',
			'С Новым 2027 годом!',
			'Запустить праздничный салют',
			false,
		),
		'С Новым 2027 годом! Запустить праздничный салют',
	);
});
