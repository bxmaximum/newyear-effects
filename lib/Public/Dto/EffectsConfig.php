<?php

declare(strict_types=1);

namespace Newyear\Effects\Public\Dto;

final readonly class EffectsConfig
{
    /**
     * @param string[] $excludeUrls
     * @param string[] $garlandColors
     */
    public function __construct(
        public bool $enabled,
        public string $scheduleMode,
        public string $scheduleStart,
        public string $scheduleEnd,
        public array $excludeUrls,
        public string $mobileMode,
        public string $performanceMode,
        public bool $respectReducedMotion,

        public bool $snowEnabled,
        public int $snowIntensity,
        public int $snowSpeed,
        public int $snowSizeMin,
        public int $snowSizeMax,
        public int $snowWind,
        public bool $snowInteractive,
        public bool $snowDepth,
        public string $snowColor,

        public bool $garlandEnabled,
        public string $garlandSelector,
        public string $garlandMode,
        public string $garlandPalette,
        public array $garlandColors,
        public int $garlandSpeed,
        public int $garlandOffsetTop,
        public bool $garlandInteractive,

        public bool $decorationsEnabled,
        public string $decorationsSelector,
        public string $decorationsType,
        public string $decorationsPosition,
        public string $decorationsSize,

        public bool $frostEnabled,
        public int $frostOpacity,
        public bool $sparklesEnabled,
        public string $widgetMode,
        public string $widgetPosition,
    ) {
    }

    public function hasAnyVisualEffect(): bool
    {
        return $this->snowEnabled
            || $this->garlandEnabled
            || $this->decorationsEnabled
            || $this->frostEnabled
            || $this->sparklesEnabled
            || $this->widgetMode !== 'hidden';
    }

    /**
     * @return array<string, mixed>
     */
    public function toClientArray(): array
    {
        return [
            'performance' => [
                'mode' => $this->performanceMode,
                'mobileMode' => $this->mobileMode,
                'respectReducedMotion' => $this->respectReducedMotion,
            ],
            'snow' => [
                'enabled' => $this->snowEnabled,
                'intensity' => $this->snowIntensity,
                'speed' => $this->snowSpeed,
                'sizeMin' => $this->snowSizeMin,
                'sizeMax' => $this->snowSizeMax,
                'wind' => $this->snowWind,
                'interactive' => $this->snowInteractive,
                'depth' => $this->snowDepth,
                'color' => $this->snowColor,
            ],
            'garland' => [
                'enabled' => $this->garlandEnabled,
                'selector' => $this->garlandSelector,
                'mode' => $this->garlandMode,
                'palette' => $this->garlandPalette,
                'colors' => $this->garlandColors,
                'speed' => $this->garlandSpeed,
                'offsetTop' => $this->garlandOffsetTop,
                'interactive' => $this->garlandInteractive,
            ],
            'decorations' => [
                'enabled' => $this->decorationsEnabled,
                'selector' => $this->decorationsSelector,
                'type' => $this->decorationsType,
                'position' => $this->decorationsPosition,
                'size' => $this->decorationsSize,
            ],
            'frost' => [
                'enabled' => $this->frostEnabled,
                'opacity' => $this->frostOpacity,
            ],
            'sparkles' => [
                'enabled' => $this->sparklesEnabled,
            ],
            'widget' => [
                'mode' => $this->widgetMode,
                'position' => $this->widgetPosition,
            ],
        ];
    }
}
