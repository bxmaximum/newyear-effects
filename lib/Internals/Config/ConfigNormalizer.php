<?php

declare(strict_types=1);

namespace Newyear\Effects\Internals\Config;

use Newyear\Effects\Public\Dto\EffectsConfig;

final class ConfigNormalizer
{
    public const SCHEDULE_MODES = ['always', 'dates', 'admin_preview'];
    public const MOBILE_MODES = ['full', 'eco', 'off'];
    public const PERFORMANCE_MODES = ['auto', 'high', 'balanced', 'eco'];
    public const GARLAND_MODES = ['twinkle', 'wave', 'chase', 'sparkle', 'steady'];
    public const GARLAND_PALETTES = ['classic', 'warm_gold', 'nordic', 'candy', 'custom'];
    public const DECORATION_TYPES = ['hat', 'ball', 'star', 'candy', 'wreath', 'bell', 'snowflake'];
    public const DECORATION_POSITIONS = ['top-right', 'top-left', 'top-center'];
    public const DECORATION_SIZES = ['sm', 'md', 'lg'];
    public const WIDGET_MODES = ['countdown', 'toggle', 'hidden'];
    public const WIDGET_POSITIONS = ['bottom-right', 'bottom-left'];

    /** @var array<string, string[]> */
    public const PALETTE_COLORS = [
        'classic' => ['#ff4d4f', '#52c41a', '#fadb14', '#1890ff', '#eb2f96'],
        'warm_gold' => ['#ffd666', '#ffec99', '#ffa940', '#fff1b8', '#ffc53d'],
        'nordic' => ['#91d5ff', '#e6f7ff', '#69c0ff', '#d6e4ff', '#bae7ff'],
        'candy' => ['#ff4d4f', '#ffffff', '#36cfc9', '#ffd666', '#ff7875'],
    ];

    private const BOOL_KEYS = [
        'enabled',
        'respect_reduced_motion',
        'snow_enabled',
        'snow_interactive',
        'snow_depth',
        'garland_enabled',
        'garland_interactive',
        'decorations_enabled',
        'frost_enabled',
        'sparkles_enabled',
    ];

    /** @var array<string, array{0: int, 1: int}> */
    private const INT_RULES = [
        'snow_intensity' => [1, 100],
        'snow_speed' => [1, 10],
        'snow_size_min' => [3, 30],
        'snow_size_max' => [6, 40],
        'snow_wind' => [0, 10],
        'garland_speed' => [300, 4000],
        'garland_offset_top' => [-20, 120],
        'frost_opacity' => [10, 80],
    ];

    /** @var array<string, array{0: string[], 1: string}> */
    private const ENUM_RULES = [
        'schedule_mode' => [self::SCHEDULE_MODES, 'always'],
        'mobile_mode' => [self::MOBILE_MODES, 'eco'],
        'performance_mode' => [self::PERFORMANCE_MODES, 'auto'],
        'garland_mode' => [self::GARLAND_MODES, 'twinkle'],
        'garland_palette' => [self::GARLAND_PALETTES, 'warm_gold'],
        'decorations_type' => [self::DECORATION_TYPES, 'hat'],
        'decorations_position' => [self::DECORATION_POSITIONS, 'top-right'],
        'decorations_size' => [self::DECORATION_SIZES, 'md'],
        'widget_mode' => [self::WIDGET_MODES, 'countdown'],
        'widget_position' => [self::WIDGET_POSITIONS, 'bottom-right'],
    ];

    /**
     * @param array<string, mixed> $input
     * @return array<string, string>
     */
    public function normalizeForStorage(array $input): array
    {
        $normalized = [];

        foreach (self::BOOL_KEYS as $key) {
            if (array_key_exists($key, $input)) {
                $value = $input[$key];
                $normalized[$key] = ($value === 'Y' || $value === true || $value === '1' || $value === 1)
                    ? 'Y'
                    : 'N';
            }
        }

        foreach (self::INT_RULES as $key => [$min, $max]) {
            if (array_key_exists($key, $input)) {
                $normalized[$key] = (string)$this->clampInt((int)$input[$key], $min, $max);
            }
        }

        foreach (self::ENUM_RULES as $key => [$allowed, $fallback]) {
            if (array_key_exists($key, $input)) {
                $normalized[$key] = $this->whitelist((string)$input[$key], $allowed, $fallback);
            }
        }

        if (array_key_exists('schedule_start', $input)) {
            $normalized['schedule_start'] = $this->sanitizeMonthDay((string)$input['schedule_start'], '12-15');
        }

        if (array_key_exists('schedule_end', $input)) {
            $normalized['schedule_end'] = $this->sanitizeMonthDay((string)$input['schedule_end'], '01-15');
        }

        if (array_key_exists('exclude_urls', $input)) {
            $rawUrls = is_array($input['exclude_urls'])
                ? implode("\n", array_map('strval', $input['exclude_urls']))
                : (string)$input['exclude_urls'];
            $normalized['exclude_urls'] = implode("\n", $this->parseExcludeUrls($rawUrls));
        }

        if (array_key_exists('snow_color', $input)) {
            $normalized['snow_color'] = $this->sanitizeHexColor((string)$input['snow_color'], '#ffffff');
        }

        if (array_key_exists('garland_selector', $input)) {
            $normalized['garland_selector'] = $this->sanitizeSelector(
                (string)$input['garland_selector'],
                'header, .header, #header',
            );
        }

        if (array_key_exists('garland_colors', $input)) {
            $rawColors = is_array($input['garland_colors'])
                ? implode(',', array_map('strval', $input['garland_colors']))
                : (string)$input['garland_colors'];
            $normalized['garland_colors'] = implode(',', $this->parseColors($rawColors));
        }

        if (array_key_exists('decorations_selector', $input)) {
            $normalized['decorations_selector'] = $this->sanitizeSelector(
                (string)$input['decorations_selector'],
                '.logo, #logo, .site-logo',
            );
        }

        return $normalized;
    }

    /**
     * @param array<string, string> $stored
     * @param array<string, string> $defaults
     */
    public function createConfig(array $stored, array $defaults): EffectsConfig
    {
        $values = array_replace($defaults, $this->normalizeForStorage(array_replace($defaults, $stored)));

        $sizeMin = (int)$values['snow_size_min'];
        $sizeMax = (int)$values['snow_size_max'];
        if ($sizeMin > $sizeMax) {
            [$sizeMin, $sizeMax] = [$sizeMax, $sizeMin];
        }

        $palette = $values['garland_palette'];
        $colors = $palette === 'custom'
            ? $this->parseColors($values['garland_colors'])
            : (self::PALETTE_COLORS[$palette] ?? self::PALETTE_COLORS['warm_gold']);

        return new EffectsConfig(
            enabled: $values['enabled'] === 'Y',
            scheduleMode: $values['schedule_mode'],
            scheduleStart: $values['schedule_start'],
            scheduleEnd: $values['schedule_end'],
            excludeUrls: $this->parseExcludeUrls($values['exclude_urls']),
            mobileMode: $values['mobile_mode'],
            performanceMode: $values['performance_mode'],
            respectReducedMotion: $values['respect_reduced_motion'] === 'Y',

            snowEnabled: $values['snow_enabled'] === 'Y',
            snowIntensity: (int)$values['snow_intensity'],
            snowSpeed: (int)$values['snow_speed'],
            snowSizeMin: $sizeMin,
            snowSizeMax: $sizeMax,
            snowWind: (int)$values['snow_wind'],
            snowInteractive: $values['snow_interactive'] === 'Y',
            snowDepth: $values['snow_depth'] === 'Y',
            snowColor: $values['snow_color'],

            garlandEnabled: $values['garland_enabled'] === 'Y',
            garlandSelector: $values['garland_selector'],
            garlandMode: $values['garland_mode'],
            garlandPalette: $palette,
            garlandColors: $colors,
            garlandSpeed: (int)$values['garland_speed'],
            garlandOffsetTop: (int)$values['garland_offset_top'],
            garlandInteractive: $values['garland_interactive'] === 'Y',

            decorationsEnabled: $values['decorations_enabled'] === 'Y',
            decorationsSelector: $values['decorations_selector'],
            decorationsType: $values['decorations_type'],
            decorationsPosition: $values['decorations_position'],
            decorationsSize: $values['decorations_size'],

            frostEnabled: $values['frost_enabled'] === 'Y',
            frostOpacity: (int)$values['frost_opacity'],
            sparklesEnabled: $values['sparkles_enabled'] === 'Y',
            widgetMode: $values['widget_mode'],
            widgetPosition: $values['widget_position'],
        );
    }

    /** @return string[] */
    public function parseColors(string $raw): array
    {
        $parts = array_filter(array_map('trim', explode(',', $raw)));
        $valid = [];

        foreach ($parts as $part) {
            $sanitized = $this->sanitizeHexColor($part, '');
            if ($sanitized !== '') {
                $valid[] = $sanitized;
            }
        }

        return array_slice($valid !== [] ? $valid : self::PALETTE_COLORS['classic'], 0, 12);
    }

    private function clampInt(int $value, int $min, int $max): int
    {
        return max($min, min($max, $value));
    }

    /** @param string[] $allowed */
    private function whitelist(string $value, array $allowed, string $fallback): string
    {
        $trimmed = trim($value);

        return in_array($trimmed, $allowed, true) ? $trimmed : $fallback;
    }

    private function sanitizeHexColor(string $value, string $fallback): string
    {
        $trimmed = strtolower(trim($value));
        if (preg_match('/^#[0-9a-f]{6}$/', $trimmed) === 1) {
            return $trimmed;
        }
        if (preg_match('/^#([0-9a-f])([0-9a-f])([0-9a-f])$/', $trimmed, $matches) === 1) {
            return '#' . $matches[1] . $matches[1] . $matches[2] . $matches[2] . $matches[3] . $matches[3];
        }

        return $fallback;
    }

    private function sanitizeSelector(string $value, string $fallback): string
    {
        $cleaned = preg_replace('/[\x00-\x1F\x7F<>{};`]/', '', $value);
        $cleaned = trim((string)$cleaned);

        return $cleaned !== '' ? mb_substr($cleaned, 0, 255) : $fallback;
    }

    private function sanitizeMonthDay(string $value, string $fallback): string
    {
        $trimmed = trim($value);
        if (preg_match('/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/', $trimmed, $matches) !== 1) {
            return $fallback;
        }

        return checkdate((int)$matches[1], (int)$matches[2], 2000) ? $trimmed : $fallback;
    }

    /** @return string[] */
    private function parseExcludeUrls(string $raw): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $raw) ?: [];
        $patterns = [];

        foreach ($lines as $line) {
            $pattern = trim(preg_replace('/[\x00-\x1F\x7F]/', '', $line) ?? '');
            if ($pattern !== '') {
                $patterns[] = mb_substr($pattern, 0, 255);
            }
        }

        return array_slice(array_values(array_unique($patterns)), 0, 50);
    }
}
