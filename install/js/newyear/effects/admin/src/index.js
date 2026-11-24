import './style.css';

const PREVIEW_DELAY = 120;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

let initialized = false;

function isPlainObject(value)
{
	return value !== null
		&& !Array.isArray(value)
		&& Object.getPrototypeOf(value) === Object.prototype;
}

function readAdminConfig()
{
	const configNode = document.getElementById('newyear-effects-admin-config');
	if (!configNode || !configNode.textContent)
	{
		return null;
	}

	try
	{
		const config = JSON.parse(configNode.textContent);
		if (!isPlainObject(config) || !isPlainObject(config.palettes))
		{
			return null;
		}

		return config;
	}
	catch
	{
		return null;
	}
}

function getElementValue(id)
{
	const element = document.getElementById(id);

	return element ? element.value : '';
}

function isElementChecked(id)
{
	const element = document.getElementById(id);

	return Boolean(element && element.checked);
}

function resolveGarlandColors(palettes)
{
	const paletteKey = getElementValue('ny_garland_palette') || 'warm_gold';
	const customColors = getElementValue('ny_garland_colors')
		.split(',')
		.map((color) => color.trim())
		.filter((color) => HEX_COLOR_PATTERN.test(color));

	return {
		paletteKey,
		colors: paletteKey === 'custom' && customColors.length > 0
			? customColors
			: (palettes[paletteKey] || palettes.warm_gold),
	};
}

function readInteger(id, fallback)
{
	return Number.parseInt(getElementValue(id), 10) || fallback;
}

function readPerformanceConfig()
{
	return {
		mode: getElementValue('ny_performance_mode') || 'auto',
		mobileMode: getElementValue('ny_mobile_mode') || 'eco',
		respectReducedMotion: isElementChecked('ny_respect_reduced_motion'),
	};
}

function readSnowConfig(effectsEnabled)
{
	return {
		enabled: effectsEnabled && isElementChecked('ny_snow_enabled'),
		intensity: readInteger('ny_snow_intensity', 55),
		speed: readInteger('ny_snow_speed', 4),
		sizeMin: readInteger('ny_snow_size_min', 6),
		sizeMax: readInteger('ny_snow_size_max', 18),
		wind: readInteger('ny_snow_wind', 0),
		depth: isElementChecked('ny_snow_depth'),
		interactive: isElementChecked('ny_snow_interactive'),
		color: getElementValue('ny_snow_color') || '#ffffff',
	};
}

function readGarlandConfig(effectsEnabled, palettes)
{
	const resolved = resolveGarlandColors(palettes);

	return {
		enabled: effectsEnabled && isElementChecked('ny_garland_enabled'),
		selector: '#ny-preview-header',
		mode: getElementValue('ny_garland_mode') || 'twinkle',
		palette: resolved.paletteKey,
		colors: resolved.colors,
		speed: readInteger('ny_garland_speed', 1200),
		offsetTop: readInteger('ny_garland_offset_top', 0),
		interactive: isElementChecked('ny_garland_interactive'),
	};
}

function readDecorationsConfig(effectsEnabled)
{
	return {
		enabled: effectsEnabled && isElementChecked('ny_decorations_enabled'),
		selector: '#ny-preview-logo',
		type: getElementValue('ny_decorations_type') || 'hat',
		position: getElementValue('ny_decorations_position') || 'top-right',
		size: getElementValue('ny_decorations_size') || 'md',
	};
}

function readFormConfig(palettes)
{
	const effectsEnabled = isElementChecked('ny_enabled');

	return {
		performance: readPerformanceConfig(),
		snow: readSnowConfig(effectsEnabled),
		garland: readGarlandConfig(effectsEnabled, palettes),
		decorations: readDecorationsConfig(effectsEnabled),
		frost: {
			enabled: effectsEnabled && isElementChecked('ny_frost_enabled'),
			opacity: readInteger('ny_frost_opacity', 35),
		},
		sparkles: {
			enabled: effectsEnabled && isElementChecked('ny_sparkles_enabled'),
		},
		widget: {
			mode: effectsEnabled ? (getElementValue('ny_widget_mode') || 'countdown') : 'hidden',
			position: getElementValue('ny_widget_position') || 'bottom-right',
		},
	};
}

function getEngineClass()
{
	return BX.Newyear
		&& BX.Newyear.Effects
		&& BX.Newyear.Effects.Engine
		&& BX.Newyear.Effects.Engine.NewyearEffectsEngine;
}

class PreviewController
{
	constructor(stage, tierValue, palettes)
	{
		this.stage = stage;
		this.tierValue = tierValue;
		this.palettes = palettes;
		this.engine = null;
		this.debounceTimer = 0;
	}

	update()
	{
		const EngineClass = getEngineClass();
		if (!EngineClass)
		{
			return;
		}

		const config = readFormConfig(this.palettes);
		if (this.engine)
		{
			this.engine.updateConfig(config);
		}
		else
		{
			this.engine = new EngineClass(config, {
				mountTarget: this.stage,
				rootNode: this.stage,
				ignoreUserPreference: true,
			});
			this.engine.start();
		}

		if (this.tierValue)
		{
			this.tierValue.textContent = this.engine.getPerformanceInfo().tier.toUpperCase();
		}
	}

	schedule()
	{
		clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => this.update(), PREVIEW_DELAY);
	}

	celebrate()
	{
		if (this.engine)
		{
			this.engine.celebrate(
				this.stage.clientWidth * 0.5,
				this.stage.clientHeight * 0.45,
			);
		}
	}
}

function bindRangeInputs(form, schedulePreview)
{
	form.querySelectorAll('input[type="range"][data-sync-target]').forEach((range) => {
		const rangeInput = range;
		const numberInput = document.getElementById(rangeInput.getAttribute('data-sync-target'));
		if (!numberInput)
		{
			return;
		}

		BX.Event.bind(rangeInput, 'input', () => {
			numberInput.value = rangeInput.value;
			schedulePreview();
		});
		BX.Event.bind(numberInput, 'input', () => {
			rangeInput.value = numberInput.value;
		});
	});
}

function bindColorInputs(colorPicker, colorInput, schedulePreview)
{
	if (!colorPicker || !colorInput)
	{
		return;
	}

	const picker = colorPicker;
	const textInput = colorInput;

	BX.Event.bind(picker, 'input', () => {
		textInput.value = picker.value;
		schedulePreview();
	});
	BX.Event.bind(textInput, 'input', () => {
		const color = textInput.value.trim();
		if (HEX_COLOR_PATTERN.test(color))
		{
			picker.value = color;
		}
	});
}

function bindPreviewEvents(form, controller)
{
	const schedulePreview = () => controller.schedule();

	bindRangeInputs(form, schedulePreview);
	bindColorInputs(
		document.getElementById('ny_snow_color_picker'),
		document.getElementById('ny_snow_color'),
		schedulePreview,
	);

	BX.Event.bind(form, 'change', schedulePreview);
	BX.Event.bind(form, 'input', schedulePreview);

	const celebrateButton = document.getElementById('ny-preview-celebrate-btn');
	if (celebrateButton)
	{
		BX.Event.bind(celebrateButton, 'click', () => controller.celebrate());
	}
}

export function init()
{
	if (initialized)
	{
		return;
	}

	const adminConfig = readAdminConfig();
	const form = document.getElementById('ny-effects-options-form');
	const stage = document.getElementById('ny-preview-stage');
	if (!adminConfig || !form || !stage)
	{
		return;
	}

	initialized = true;

	const controller = new PreviewController(
		stage,
		document.getElementById('ny-preview-tier-val'),
		adminConfig.palettes,
	);

	bindPreviewEvents(form, controller);
	controller.update();
}

if (document.readyState === 'loading')
{
	BX.Event.bind(document, 'DOMContentLoaded', init);
}
else
{
	init();
}
