<?php

declare(strict_types=1);

/** @var CMain $APPLICATION */

use Bitrix\Main\Context;
use Bitrix\Main\DI\ServiceLocator;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\UI\Extension;
use Bitrix\Main\Web\Json;
use Newyear\Effects\Internals\Config\ConfigNormalizer;
use Newyear\Effects\Public\Service\EffectsService;

Loc::loadMessages(__FILE__);

$moduleId = 'newyear.effects';

if ($APPLICATION->GetGroupRight($moduleId) < 'W') {
    $APPLICATION->AuthForm(Loc::getMessage('NEWYEAR_EFFECTS_OPT_ACCESS_DENIED'));

    return;
}

if (!Loader::includeModule($moduleId)) {
    return;
}

Extension::load('newyear.effects.admin');

$service = ServiceLocator::getInstance()->get(EffectsService::class);
$request = Context::getCurrent()->getRequest();
$statusNote = $request->getQuery('saved') === 'Y'
    ? Loc::getMessage('NEWYEAR_EFFECTS_OPT_SAVED')
    : null;

$presetLabels = [
    'classic' => Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESET_CLASSIC'),
    'minimal' => Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESET_MINIMAL'),
    'nordic' => Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESET_NORDIC'),
    'festive' => Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESET_FESTIVE'),
    'eco' => Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESET_ECO'),
];

if ($request->isPost() && check_bitrix_sessid()) {
    $presetToApply = (string)($request->getPost('apply_preset') ?? '');

    if ($presetToApply !== '' && isset($presetLabels[$presetToApply])) {
        $presetResult = $service->applyPreset($presetToApply);
        if ($presetResult->isSuccess()) {
            $statusNote = Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESET_APPLIED', [
                '#PRESET#' => $presetLabels[$presetToApply],
            ]);
        }
    } elseif ($request->getPost('reset_defaults') !== null) {
        $service->resetConfig();
        $statusNote = Loc::getMessage('NEWYEAR_EFFECTS_OPT_RESET_DONE');
    } elseif ($request->getPost('save') !== null || $request->getPost('apply') !== null) {
        $service->saveConfig([
            'enabled' => $request->getPost('enabled') === 'Y' ? 'Y' : 'N',
            'schedule_mode' => (string)$request->getPost('schedule_mode'),
            'schedule_start' => (string)$request->getPost('schedule_start'),
            'schedule_end' => (string)$request->getPost('schedule_end'),
            'exclude_urls' => (string)$request->getPost('exclude_urls'),
            'performance_mode' => (string)$request->getPost('performance_mode'),
            'mobile_mode' => (string)$request->getPost('mobile_mode'),
            'respect_reduced_motion' => $request->getPost('respect_reduced_motion') === 'Y' ? 'Y' : 'N',

            'snow_enabled' => $request->getPost('snow_enabled') === 'Y' ? 'Y' : 'N',
            'snow_intensity' => (int)$request->getPost('snow_intensity'),
            'snow_speed' => (int)$request->getPost('snow_speed'),
            'snow_size_min' => (int)$request->getPost('snow_size_min'),
            'snow_size_max' => (int)$request->getPost('snow_size_max'),
            'snow_wind' => (int)$request->getPost('snow_wind'),
            'snow_depth' => $request->getPost('snow_depth') === 'Y' ? 'Y' : 'N',
            'snow_interactive' => $request->getPost('snow_interactive') === 'Y' ? 'Y' : 'N',
            'snow_color' => (string)$request->getPost('snow_color'),
            'sparkles_enabled' => $request->getPost('sparkles_enabled') === 'Y' ? 'Y' : 'N',

            'garland_enabled' => $request->getPost('garland_enabled') === 'Y' ? 'Y' : 'N',
            'garland_selector' => (string)$request->getPost('garland_selector'),
            'garland_mode' => (string)$request->getPost('garland_mode'),
            'garland_palette' => (string)$request->getPost('garland_palette'),
            'garland_colors' => (string)$request->getPost('garland_colors'),
            'garland_speed' => (int)$request->getPost('garland_speed'),
            'garland_offset_top' => (int)$request->getPost('garland_offset_top'),
            'garland_interactive' => $request->getPost('garland_interactive') === 'Y' ? 'Y' : 'N',

            'decorations_enabled' => $request->getPost('decorations_enabled') === 'Y' ? 'Y' : 'N',
            'decorations_selector' => (string)$request->getPost('decorations_selector'),
            'decorations_type' => (string)$request->getPost('decorations_type'),
            'decorations_position' => (string)$request->getPost('decorations_position'),
            'decorations_size' => (string)$request->getPost('decorations_size'),

            'frost_enabled' => $request->getPost('frost_enabled') === 'Y' ? 'Y' : 'N',
            'frost_opacity' => (int)$request->getPost('frost_opacity'),
            'widget_mode' => (string)$request->getPost('widget_mode'),
            'widget_position' => (string)$request->getPost('widget_position'),
        ]);

        $statusNote = Loc::getMessage('NEWYEAR_EFFECTS_OPT_SAVED');

        if ($request->getPost('save') !== null) {
            LocalRedirect(
                $APPLICATION->GetCurPage()
                . '?mid=' . urlencode($moduleId)
                . '&lang=' . urlencode(LANGUAGE_ID)
                . '&saved=Y',
            );
        }
    }
}

$config = $service->getConfig();
$rawCustomColors = $service->getRawCustomColors();
$actionUrl = htmlspecialcharsbx($APPLICATION->GetCurPage() . '?mid=' . urlencode($moduleId) . '&lang=' . urlencode(LANGUAGE_ID));

if ($statusNote !== null) {
    CAdminMessage::ShowNote($statusNote);
}

$tabs = [
    [
        'DIV' => 'ny_general',
        'TAB' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_GENERAL'),
        'TITLE' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_GENERAL_TITLE'),
    ],
    [
        'DIV' => 'ny_snow',
        'TAB' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_SNOW'),
        'TITLE' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_SNOW_TITLE'),
    ],
    [
        'DIV' => 'ny_garland',
        'TAB' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_GARLAND'),
        'TITLE' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_GARLAND_TITLE'),
    ],
    [
        'DIV' => 'ny_decorations',
        'TAB' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_DECORATIONS'),
        'TITLE' => Loc::getMessage('NEWYEAR_EFFECTS_TAB_DECORATIONS_TITLE'),
    ],
];

$tabControl = new CAdminTabControl('newyearEffectsTabControl', $tabs);
$adminConfigJson = Json::encode([
    'palettes' => ConfigNormalizer::PALETTE_COLORS,
]);
?>

<script type="application/json" id="newyear-effects-admin-config"><?= $adminConfigJson ?></script>

<div class="ny-admin-stage-wrap">
    <div class="ny-admin-stage-bar">
        <div>
            <div class="ny-admin-stage-title"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_TITLE')) ?></div>
            <div class="ny-admin-stage-sub"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_SUBTITLE')) ?></div>
        </div>
        <div class="ny-admin-stage-actions">
            <span class="ny-admin-tier-badge" id="ny-preview-tier-badge">
                <?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_TIER')) ?>: <strong id="ny-preview-tier-val">—</strong>
            </span>
            <button type="button" class="adm-btn" id="ny-preview-celebrate-btn">
                <?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_CELEBRATE')) ?>
            </button>
        </div>
    </div>

    <div class="ny-admin-stage" id="ny-preview-stage">
        <div class="ny-admin-mock-header" id="ny-preview-header">
            <div class="ny-admin-mock-logo" id="ny-preview-logo">
                <?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_LOGO')) ?>
            </div>
            <div class="ny-admin-mock-nav">
                <span><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_NAV_1')) ?></span>
                <span><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_NAV_2')) ?></span>
                <span><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PREVIEW_NAV_3')) ?></span>
            </div>
        </div>
    </div>

    <form method="post" action="<?= $actionUrl ?>" class="ny-admin-presets">
        <?= bitrix_sessid_post() ?>
        <span class="ny-admin-presets-label"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PRESETS_TITLE')) ?>:</span>
        <?php foreach ($presetLabels as $presetKey => $presetTitle): ?>
            <button type="submit" name="apply_preset" value="<?= htmlspecialcharsbx($presetKey) ?>" class="ny-admin-preset-btn">
                <?= htmlspecialcharsbx($presetTitle) ?>
            </button>
        <?php endforeach; ?>
    </form>
</div>

<form method="post" action="<?= $actionUrl ?>" id="ny-effects-options-form">
    <?= bitrix_sessid_post() ?>
    <?php
    $tabControl->Begin();

    // ==================== TAB 1: GENERAL & PERFORMANCE ====================
    $tabControl->BeginNextTab();
    ?>
    <tr class="ny-opt-row">
        <td width="40%">
            <label for="ny_enabled"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_ENABLED')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_ENABLED_HINT')) ?></div>
        </td>
        <td width="60%">
            <input type="checkbox" name="enabled" id="ny_enabled" value="Y" <?= $config->enabled ? 'checked' : '' ?>>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_schedule_mode"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_MODE')) ?>:</label></td>
        <td>
            <select name="schedule_mode" id="ny_schedule_mode">
                <option value="always" <?= $config->scheduleMode === 'always' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_ALWAYS')) ?></option>
                <option value="dates" <?= $config->scheduleMode === 'dates' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_DATES')) ?></option>
                <option value="admin_preview" <?= $config->scheduleMode === 'admin_preview' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_ADMIN')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_schedule_start"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_START')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_START_HINT')) ?></div>
        </td>
        <td>
            <input type="text" name="schedule_start" id="ny_schedule_start" maxlength="5" placeholder="12-15" value="<?= htmlspecialcharsbx($config->scheduleStart) ?>">
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_schedule_end"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_END')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SCHEDULE_END_HINT')) ?></div>
        </td>
        <td>
            <input type="text" name="schedule_end" id="ny_schedule_end" maxlength="5" placeholder="01-15" value="<?= htmlspecialcharsbx($config->scheduleEnd) ?>">
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_exclude_urls"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_EXCLUDE_URLS')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_EXCLUDE_URLS_HINT')) ?></div>
        </td>
        <td>
            <textarea name="exclude_urls" id="ny_exclude_urls" rows="4"><?= htmlspecialcharsbx(implode("\n", $config->excludeUrls)) ?></textarea>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_performance_mode"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PERFORMANCE_MODE')) ?>:</label></td>
        <td>
            <select name="performance_mode" id="ny_performance_mode">
                <option value="auto" <?= $config->performanceMode === 'auto' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PERF_AUTO')) ?></option>
                <option value="high" <?= $config->performanceMode === 'high' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PERF_HIGH')) ?></option>
                <option value="balanced" <?= $config->performanceMode === 'balanced' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PERF_BALANCED')) ?></option>
                <option value="eco" <?= $config->performanceMode === 'eco' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PERF_ECO')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_mobile_mode"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_MOBILE_MODE')) ?>:</label></td>
        <td>
            <select name="mobile_mode" id="ny_mobile_mode">
                <option value="eco" <?= $config->mobileMode === 'eco' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_MOBILE_ECO')) ?></option>
                <option value="full" <?= $config->mobileMode === 'full' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_MOBILE_FULL')) ?></option>
                <option value="off" <?= $config->mobileMode === 'off' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_MOBILE_OFF')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_respect_reduced_motion"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_REDUCED_MOTION')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_REDUCED_MOTION_HINT')) ?></div>
        </td>
        <td>
            <input type="checkbox" name="respect_reduced_motion" id="ny_respect_reduced_motion" value="Y" <?= $config->respectReducedMotion ? 'checked' : '' ?>>
        </td>
    </tr>

    <?php
    // ==================== TAB 2: SNOW & SPARKLES ====================
    $tabControl->BeginNextTab();
    ?>
    <tr class="ny-opt-row">
        <td width="40%"><label for="ny_snow_enabled"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_ENABLED')) ?>:</label></td>
        <td width="60%">
            <input type="checkbox" name="snow_enabled" id="ny_snow_enabled" value="Y" <?= $config->snowEnabled ? 'checked' : '' ?>>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_snow_intensity"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_INTENSITY')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_INTENSITY_HINT')) ?></div>
        </td>
        <td>
            <span class="ny-opt-range-row">
                <input type="range" min="1" max="100" value="<?= $config->snowIntensity ?>" data-sync-target="ny_snow_intensity">
                <input type="number" name="snow_intensity" id="ny_snow_intensity" min="1" max="100" value="<?= $config->snowIntensity ?>">
            </span>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_snow_speed"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_SPEED')) ?>:</label></td>
        <td>
            <span class="ny-opt-range-row">
                <input type="range" min="1" max="10" value="<?= $config->snowSpeed ?>" data-sync-target="ny_snow_speed">
                <input type="number" name="snow_speed" id="ny_snow_speed" min="1" max="10" value="<?= $config->snowSpeed ?>">
            </span>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_snow_size_min"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_SIZE_MIN')) ?>:</label></td>
        <td><input type="number" name="snow_size_min" id="ny_snow_size_min" min="3" max="30" value="<?= $config->snowSizeMin ?>"></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_snow_size_max"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_SIZE_MAX')) ?>:</label></td>
        <td><input type="number" name="snow_size_max" id="ny_snow_size_max" min="6" max="40" value="<?= $config->snowSizeMax ?>"></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_snow_wind"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_WIND')) ?>:</label></td>
        <td>
            <span class="ny-opt-range-row">
                <input type="range" min="0" max="10" value="<?= $config->snowWind ?>" data-sync-target="ny_snow_wind">
                <input type="number" name="snow_wind" id="ny_snow_wind" min="0" max="10" value="<?= $config->snowWind ?>">
            </span>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_snow_depth"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_DEPTH')) ?>:</label></td>
        <td><input type="checkbox" name="snow_depth" id="ny_snow_depth" value="Y" <?= $config->snowDepth ? 'checked' : '' ?>></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_snow_interactive"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_INTERACTIVE')) ?>:</label></td>
        <td><input type="checkbox" name="snow_interactive" id="ny_snow_interactive" value="Y" <?= $config->snowInteractive ? 'checked' : '' ?>></td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_snow_color"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_COLOR')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SNOW_COLOR_HINT')) ?></div>
        </td>
        <td>
            <span class="ny-opt-color-row">
                <input type="color" id="ny_snow_color_picker" value="<?= htmlspecialcharsbx($config->snowColor) ?>">
                <input type="text" name="snow_color" id="ny_snow_color" maxlength="7" value="<?= htmlspecialcharsbx($config->snowColor) ?>">
            </span>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_sparkles_enabled"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SPARKLES_ENABLED')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_SPARKLES_HINT')) ?></div>
        </td>
        <td><input type="checkbox" name="sparkles_enabled" id="ny_sparkles_enabled" value="Y" <?= $config->sparklesEnabled ? 'checked' : '' ?>></td>
    </tr>

    <?php
    // ==================== TAB 3: GARLAND ====================
    $tabControl->BeginNextTab();
    ?>
    <tr class="ny-opt-row">
        <td width="40%"><label for="ny_garland_enabled"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_ENABLED')) ?>:</label></td>
        <td width="60%">
            <input type="checkbox" name="garland_enabled" id="ny_garland_enabled" value="Y" <?= $config->garlandEnabled ? 'checked' : '' ?>>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_garland_selector"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_SELECTOR')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_SELECTOR_HINT')) ?></div>
        </td>
        <td><input type="text" name="garland_selector" id="ny_garland_selector" value="<?= htmlspecialcharsbx($config->garlandSelector) ?>"></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_garland_mode"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_MODE')) ?>:</label></td>
        <td>
            <select name="garland_mode" id="ny_garland_mode">
                <option value="twinkle" <?= $config->garlandMode === 'twinkle' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_MODE_TWINKLE')) ?></option>
                <option value="wave" <?= $config->garlandMode === 'wave' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_MODE_WAVE')) ?></option>
                <option value="chase" <?= $config->garlandMode === 'chase' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_MODE_CHASE')) ?></option>
                <option value="sparkle" <?= $config->garlandMode === 'sparkle' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_MODE_SPARKLE')) ?></option>
                <option value="steady" <?= $config->garlandMode === 'steady' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_MODE_STEADY')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_garland_palette"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_PALETTE')) ?>:</label></td>
        <td>
            <select name="garland_palette" id="ny_garland_palette">
                <option value="warm_gold" <?= $config->garlandPalette === 'warm_gold' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PALETTE_WARM_GOLD')) ?></option>
                <option value="classic" <?= $config->garlandPalette === 'classic' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PALETTE_CLASSIC')) ?></option>
                <option value="nordic" <?= $config->garlandPalette === 'nordic' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PALETTE_NORDIC')) ?></option>
                <option value="candy" <?= $config->garlandPalette === 'candy' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PALETTE_CANDY')) ?></option>
                <option value="custom" <?= $config->garlandPalette === 'custom' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_PALETTE_CUSTOM')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_garland_colors"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_COLORS')) ?>:</label></td>
        <td><input type="text" name="garland_colors" id="ny_garland_colors" value="<?= htmlspecialcharsbx($rawCustomColors) ?>"></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_garland_speed"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_SPEED')) ?>:</label></td>
        <td>
            <span class="ny-opt-range-row">
                <input type="range" min="300" max="4000" step="100" value="<?= $config->garlandSpeed ?>" data-sync-target="ny_garland_speed">
                <input type="number" name="garland_speed" id="ny_garland_speed" min="300" max="4000" step="100" value="<?= $config->garlandSpeed ?>">
            </span>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_garland_offset_top"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_OFFSET_TOP')) ?>:</label></td>
        <td><input type="number" name="garland_offset_top" id="ny_garland_offset_top" min="-20" max="120" value="<?= $config->garlandOffsetTop ?>"></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_garland_interactive"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_GARLAND_INTERACTIVE')) ?>:</label></td>
        <td><input type="checkbox" name="garland_interactive" id="ny_garland_interactive" value="Y" <?= $config->garlandInteractive ? 'checked' : '' ?>></td>
    </tr>

    <?php
    // ==================== TAB 4: DECORATIONS, FROST & WIDGET ====================
    $tabControl->BeginNextTab();
    ?>
    <tr class="ny-opt-row">
        <td width="40%"><label for="ny_decorations_enabled"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_ENABLED')) ?>:</label></td>
        <td width="60%">
            <input type="checkbox" name="decorations_enabled" id="ny_decorations_enabled" value="Y" <?= $config->decorationsEnabled ? 'checked' : '' ?>>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td>
            <label for="ny_decorations_selector"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SELECTOR')) ?>:</label>
            <div class="ny-opt-hint"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SELECTOR_HINT')) ?></div>
        </td>
        <td><input type="text" name="decorations_selector" id="ny_decorations_selector" value="<?= htmlspecialcharsbx($config->decorationsSelector) ?>"></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_decorations_type"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_TYPE')) ?>:</label></td>
        <td>
            <select name="decorations_type" id="ny_decorations_type">
                <option value="hat" <?= $config->decorationsType === 'hat' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_HAT')) ?></option>
                <option value="ball" <?= $config->decorationsType === 'ball' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_BALL')) ?></option>
                <option value="star" <?= $config->decorationsType === 'star' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_STAR')) ?></option>
                <option value="candy" <?= $config->decorationsType === 'candy' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_CANDY')) ?></option>
                <option value="wreath" <?= $config->decorationsType === 'wreath' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_WREATH')) ?></option>
                <option value="bell" <?= $config->decorationsType === 'bell' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_BELL')) ?></option>
                <option value="snowflake" <?= $config->decorationsType === 'snowflake' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SNOWFLAKE')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_decorations_position"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_POSITION')) ?>:</label></td>
        <td>
            <select name="decorations_position" id="ny_decorations_position">
                <option value="top-right" <?= $config->decorationsPosition === 'top-right' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_POS_TR')) ?></option>
                <option value="top-left" <?= $config->decorationsPosition === 'top-left' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_POS_TL')) ?></option>
                <option value="top-center" <?= $config->decorationsPosition === 'top-center' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_POS_TC')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_decorations_size"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SIZE')) ?>:</label></td>
        <td>
            <select name="decorations_size" id="ny_decorations_size">
                <option value="sm" <?= $config->decorationsSize === 'sm' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SIZE_SM')) ?></option>
                <option value="md" <?= $config->decorationsSize === 'md' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SIZE_MD')) ?></option>
                <option value="lg" <?= $config->decorationsSize === 'lg' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_DECOR_SIZE_LG')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_frost_enabled"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_FROST_ENABLED')) ?>:</label></td>
        <td><input type="checkbox" name="frost_enabled" id="ny_frost_enabled" value="Y" <?= $config->frostEnabled ? 'checked' : '' ?>></td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_frost_opacity"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_FROST_OPACITY')) ?>:</label></td>
        <td>
            <span class="ny-opt-range-row">
                <input type="range" min="10" max="80" value="<?= $config->frostOpacity ?>" data-sync-target="ny_frost_opacity">
                <input type="number" name="frost_opacity" id="ny_frost_opacity" min="10" max="80" value="<?= $config->frostOpacity ?>">
            </span>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_widget_mode"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_MODE')) ?>:</label></td>
        <td>
            <select name="widget_mode" id="ny_widget_mode">
                <option value="countdown" <?= $config->widgetMode === 'countdown' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_COUNTDOWN')) ?></option>
                <option value="toggle" <?= $config->widgetMode === 'toggle' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_TOGGLE')) ?></option>
                <option value="hidden" <?= $config->widgetMode === 'hidden' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_HIDDEN')) ?></option>
            </select>
        </td>
    </tr>

    <tr class="ny-opt-row">
        <td><label for="ny_widget_position"><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_POSITION')) ?>:</label></td>
        <td>
            <select name="widget_position" id="ny_widget_position">
                <option value="bottom-right" <?= $config->widgetPosition === 'bottom-right' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_POS_BR')) ?></option>
                <option value="bottom-left" <?= $config->widgetPosition === 'bottom-left' ? 'selected' : '' ?>><?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_WIDGET_POS_BL')) ?></option>
            </select>
        </td>
    </tr>

    <?php $tabControl->Buttons(); ?>
    <input type="submit" name="save" value="<?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_BTN_SAVE')) ?>" class="adm-btn-save">
    <input type="submit" name="apply" value="<?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_BTN_APPLY')) ?>" class="adm-btn">
    <input
        type="submit"
        name="reset_defaults"
        value="<?= htmlspecialcharsbx(Loc::getMessage('NEWYEAR_EFFECTS_OPT_BTN_RESET')) ?>"
        class="adm-btn"
        onclick="return confirm(<?= htmlspecialcharsbx(Json::encode((string)Loc::getMessage('NEWYEAR_EFFECTS_OPT_RESET_CONFIRM'))) ?>);"
    >
    <?php $tabControl->End(); ?>
</form>
