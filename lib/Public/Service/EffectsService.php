<?php

declare(strict_types=1);

namespace Newyear\Effects\Public\Service;

use Bitrix\Main\Error;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\Result;
use Newyear\Effects\Internals\Contract\ConfigRepositoryInterface;
use Newyear\Effects\Internals\Service\PresetService;
use Newyear\Effects\Internals\Service\ScheduleService;
use Newyear\Effects\Public\Dto\EffectsConfig;

final class EffectsService
{
    private const ALLOWED_TOGGLE_EFFECTS = ['snow', 'garland', 'decorations', 'frost', 'sparkles'];

    public const ERROR_UNKNOWN_PRESET = 'NEWYEAR_UNKNOWN_PRESET';
    public const ERROR_INVALID_EFFECT = 'NEWYEAR_INVALID_EFFECT';

    public function __construct(
        private readonly ConfigRepositoryInterface $configRepository,
        private readonly ScheduleService $scheduleService,
        private readonly PresetService $presetService,
    ) {
    }

    public function getConfig(): EffectsConfig
    {
        return $this->configRepository->getConfig();
    }

    /**
     * @param array<string, mixed> $input
     */
    public function saveConfig(array $input): EffectsConfig
    {
        return $this->configRepository->saveFromArray($input);
    }

    public function resetConfig(): EffectsConfig
    {
        return $this->configRepository->resetToDefaults();
    }

    public function applyPreset(string $presetId): Result
    {
        $result = new Result();
        $preset = $this->presetService->get($presetId);
        if ($preset === null) {
            return $result->addError(new Error(
                Loc::getMessage('NEWYEAR_EFFECTS_ERROR_UNKNOWN_PRESET', ['#PRESET#' => $presetId])
                    ?: 'Unknown preset: ' . $presetId,
                self::ERROR_UNKNOWN_PRESET,
            ));
        }

        $config = $this->configRepository->saveFromArray($preset);
        $result->setData(['config' => $config]);

        return $result;
    }

    public function setEffectEnabled(string $effect, bool $enabled): Result
    {
        $result = new Result();
        if (!in_array($effect, self::ALLOWED_TOGGLE_EFFECTS, true)) {
            return $result->addError(new Error(
                Loc::getMessage('NEWYEAR_EFFECTS_ERROR_INVALID_EFFECT', ['#EFFECT#' => $effect])
                    ?: 'Unsupported effect: ' . $effect,
                self::ERROR_INVALID_EFFECT,
            ));
        }

        $this->configRepository->saveFromArray([
            $effect . '_enabled' => $enabled ? 'Y' : 'N',
        ]);

        return $result;
    }

    public function setSnowIntensity(int $intensity): void
    {
        $this->configRepository->saveFromArray(['snow_intensity' => $intensity]);
    }

    public function shouldRenderOnPath(string $requestPath, bool $isAdmin = false, ?\DateTimeInterface $now = null): bool
    {
        return $this->getActiveConfig($requestPath, $isAdmin, $now) !== null;
    }

    public function getActiveConfig(
        string $requestPath,
        bool $isAdmin = false,
        ?\DateTimeInterface $now = null,
    ): ?EffectsConfig
    {
        $config = $this->configRepository->getConfig();
        if (!$this->scheduleService->isActive($config, $now, $isAdmin)) {
            return null;
        }

        if ($this->scheduleService->isUrlExcluded($requestPath, $config->excludeUrls)) {
            return null;
        }

        return $config;
    }

    public function getRawCustomColors(): string
    {
        return $this->configRepository->getRawCustomColors();
    }
}
