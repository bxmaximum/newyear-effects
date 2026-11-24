<?php

declare(strict_types=1);

namespace Newyear\Effects\Internals\Service;

use Bitrix\Main\Config\Option;
use Bitrix\Main\Composite\Page;
use Newyear\Effects\Internals\Config\ConfigNormalizer;
use Newyear\Effects\Internals\Contract\ConfigRepositoryInterface;
use Newyear\Effects\Public\Dto\EffectsConfig;
use RuntimeException;

final class ConfigService implements ConfigRepositoryInterface
{
    public const MODULE_ID = 'newyear.effects';

    private ?EffectsConfig $config = null;

    /** @var array<string, string>|null */
    private ?array $defaults = null;

    public function __construct(private readonly ConfigNormalizer $normalizer)
    {
    }

    public function getConfig(): EffectsConfig
    {
        if ($this->config !== null) {
            return $this->config;
        }

        $defaults = $this->getDefaults();
        $stored = [];
        foreach ($defaults as $name => $defaultValue) {
            $stored[$name] = (string)Option::get(self::MODULE_ID, $name, $defaultValue);
        }

        return $this->config = $this->normalizer->createConfig($stored, $defaults);
    }

    /**
     * @param array<string, mixed> $input
     */
    public function saveFromArray(array $input): EffectsConfig
    {
        foreach ($this->normalizer->normalizeForStorage($input) as $name => $value) {
            Option::set(self::MODULE_ID, $name, $value);
        }

        $this->config = null;
        $this->clearCompositeCache();

        return $this->getConfig();
    }

    public function getRawCustomColors(): string
    {
        $defaults = $this->getDefaults();
        $raw = (string)Option::get(
            self::MODULE_ID,
            'garland_colors',
            $defaults['garland_colors'],
        );

        return implode(',', $this->normalizer->parseColors($raw));
    }

    public function resetToDefaults(): EffectsConfig
    {
        Option::delete(self::MODULE_ID);
        $this->config = null;
        $this->clearCompositeCache();

        return $this->getConfig();
    }

    /**
     * @return array<string, string>
     */
    private function getDefaults(): array
    {
        if ($this->defaults !== null) {
            return $this->defaults;
        }

        $newyear_effects_default_option = null;
        require dirname(__DIR__, 3) . '/default_option.php';

        if (!is_array($newyear_effects_default_option)) {
            throw new RuntimeException('New Year Effects defaults are not available.');
        }

        /** @var array<string, string> $newyear_effects_default_option */
        return $this->defaults = $newyear_effects_default_option;
    }

    private function clearCompositeCache(): void
    {
        try {
            Page::getInstance()->deleteAll();
        } catch (\Throwable) {
            // Сбой очистки композита не должен отменять сохранение проверенных настроек.
        }
    }
}
