<?php

declare(strict_types=1);

namespace Bitrix\Main {
    final class Error
    {
        public function __construct(
            private readonly string $message,
            private readonly string|int|null $code = null,
        ) {
        }

        public function getMessage(): string
        {
            return $this->message;
        }

        public function getCode(): string|int|null
        {
            return $this->code;
        }
    }

    class Result
    {
        /** @var Error[] */
        private array $errors = [];

        /** @var array<string, mixed> */
        private array $data = [];

        public function addError(Error $error): self
        {
            $this->errors[] = $error;

            return $this;
        }

        public function isSuccess(): bool
        {
            return $this->errors === [];
        }

        /** @return Error[] */
        public function getErrors(): array
        {
            return $this->errors;
        }

        /** @param array<string, mixed> $data */
        public function setData(array $data): void
        {
            $this->data = $data;
        }

        /** @return array<string, mixed> */
        public function getData(): array
        {
            return $this->data;
        }
    }
}

namespace Bitrix\Main\Localization {
    final class Loc
    {
        /** @param array<string, scalar>|null $replacements */
        public static function getMessage(string $code, ?array $replacements = null): ?string
        {
            return null;
        }
    }
}

namespace {
    use Newyear\Effects\Internals\Config\ConfigNormalizer;
    use Newyear\Effects\Internals\Contract\ConfigRepositoryInterface;
    use Newyear\Effects\Internals\Service\PresetService;
    use Newyear\Effects\Internals\Service\ScheduleService;
    use Newyear\Effects\Public\Dto\EffectsConfig;
    use Newyear\Effects\Public\Service\EffectsService;

    $moduleRoot = dirname(__DIR__, 2);

    spl_autoload_register(static function (string $class) use ($moduleRoot): void {
        $prefix = 'Newyear\\Effects\\';
        if (!str_starts_with($class, $prefix)) {
            return;
        }

        $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
        $file = $moduleRoot . '/lib/' . $relative . '.php';
        if (is_file($file)) {
            require_once $file;
        }
    });

    /** @return array<string, string> */
    function loadModuleDefaults(string $moduleRoot): array
    {
        $newyear_effects_default_option = null;
        require $moduleRoot . '/default_option.php';

        if (!is_array($newyear_effects_default_option)) {
            throw new RuntimeException('Cannot load module defaults.');
        }

        return $newyear_effects_default_option;
    }

    function assertSameValue(mixed $expected, mixed $actual, string $message = ''): void
    {
        if ($expected !== $actual) {
            throw new RuntimeException(($message !== '' ? $message . ': ' : '')
                . 'expected ' . var_export($expected, true)
                . ', got ' . var_export($actual, true));
        }
    }

    function assertTrueValue(bool $condition, string $message = ''): void
    {
        if (!$condition) {
            throw new RuntimeException($message !== '' ? $message : 'Expected true.');
        }
    }

    final class FakeConfigRepository implements ConfigRepositoryInterface
    {
        /** @var array<string, mixed> */
        public array $lastSaved = [];

        public function __construct(private EffectsConfig $config)
        {
        }

        public function getConfig(): EffectsConfig
        {
            return $this->config;
        }

        public function saveFromArray(array $input): EffectsConfig
        {
            $this->lastSaved = $input;

            return $this->config;
        }

        public function getRawCustomColors(): string
        {
            return '#ffffff';
        }

        public function resetToDefaults(): EffectsConfig
        {
            return $this->config;
        }
    }

    $normalizer = new ConfigNormalizer();
    $defaults = loadModuleDefaults($moduleRoot);
    $defaultConfig = $normalizer->createConfig($defaults, $defaults);
    $schedule = new ScheduleService();

    $tests = [
        'normalizes ranges, colors, enums, and real calendar dates' => static function () use ($normalizer): void {
            $values = $normalizer->normalizeForStorage([
                'snow_intensity' => 500,
                'snow_color' => '#abc',
                'performance_mode' => 'turbo',
                'schedule_start' => '02-31',
                'schedule_end' => '02-29',
            ]);

            assertSameValue('100', $values['snow_intensity']);
            assertSameValue('#aabbcc', $values['snow_color']);
            assertSameValue('auto', $values['performance_mode']);
            assertSameValue('12-15', $values['schedule_start']);
            assertSameValue('02-29', $values['schedule_end']);
        },
        'creates a stable client config and swaps inverted snow sizes' => static function () use ($normalizer, $defaults): void {
            $config = $normalizer->createConfig([
                'snow_size_min' => '28',
                'snow_size_max' => '8',
                'garland_palette' => 'custom',
                'garland_colors' => '#abc,#123456,invalid',
            ], $defaults);

            assertSameValue(8, $config->snowSizeMin);
            assertSameValue(28, $config->snowSizeMax);
            assertSameValue(['#aabbcc', '#123456'], $config->garlandColors);
            assertTrueValue(!array_key_exists('version', $config->toClientArray()));
        },
        'supports annual and cross-year schedule boundaries' => static function () use ($schedule): void {
            assertTrueValue($schedule->isWithinAnnualRange('12-01', '12-31', new DateTimeImmutable('2026-12-01')));
            assertTrueValue($schedule->isWithinAnnualRange('12-01', '12-31', new DateTimeImmutable('2026-12-31')));
            assertTrueValue($schedule->isWithinAnnualRange('12-15', '01-15', new DateTimeImmutable('2027-01-15')));
            assertSameValue(false, $schedule->isWithinAnnualRange('12-15', '01-15', new DateTimeImmutable('2027-02-01')));
        },
        'matches excluded URL masks without query strings' => static function () use ($schedule): void {
            $patterns = ['/basket/*', '/Personal/Order/*'];
            assertTrueValue($schedule->isUrlExcluded('/basket/checkout/?step=2', $patterns));
            assertTrueValue($schedule->isUrlExcluded('/personal/order/42', $patterns));
            assertSameValue(false, $schedule->isUrlExcluded('/catalog/', $patterns));
        },
        'exposes only the canonical v2 config DTO' => static function () use ($defaultConfig): void {
            assertSameValue(EffectsConfig::class, $defaultConfig::class);
        },
        'validates public effect toggles before storage' => static function () use ($defaultConfig, $schedule): void {
            $repository = new FakeConfigRepository($defaultConfig);
            $service = new EffectsService($repository, $schedule, new PresetService());

            assertTrueValue($service->setEffectEnabled('snow', false)->isSuccess());
            assertSameValue(['snow_enabled' => 'N'], $repository->lastSaved);

            $errorResult = $service->setEffectEnabled('unknown', true);
            assertSameValue(false, $errorResult->isSuccess());
            assertSameValue(EffectsService::ERROR_INVALID_EFFECT, $errorResult->getErrors()[0]->getCode());
        },
        'returns one active config and rejects excluded paths' => static function () use ($defaultConfig, $schedule): void {
            $repository = new FakeConfigRepository($defaultConfig);
            $service = new EffectsService($repository, $schedule, new PresetService());

            assertSameValue($defaultConfig, $service->getActiveConfig('/catalog/'));
            assertSameValue(null, $service->getActiveConfig('/basket/checkout/'));
        },
        'ships all documented presets' => static function (): void {
            assertSameValue(['classic', 'minimal', 'nordic', 'festive', 'eco'], array_keys((new PresetService())->getAll()));
        },
        'keeps PHP and frontend package versions in sync' => static function () use ($moduleRoot): void {
            $arModuleVersion = null;
            require $moduleRoot . '/install/version.php';
            $package = json_decode(
                (string)file_get_contents($moduleRoot . '/package.json'),
                true,
                flags: JSON_THROW_ON_ERROR,
            );

            assertTrueValue(is_array($arModuleVersion));
            assertTrueValue(is_array($package));
            assertSameValue($arModuleVersion['VERSION'], $package['version']);
        },
    ];

    $failures = 0;
    foreach ($tests as $name => $test) {
        try {
            $test();
            echo "ok - {$name}\n";
        } catch (Throwable $exception) {
            $failures++;
            fwrite(STDERR, "not ok - {$name}: {$exception->getMessage()}\n");
        }
    }

    echo sprintf("%d tests, %d failures\n", count($tests), $failures);
    exit($failures === 0 ? 0 : 1);
}
