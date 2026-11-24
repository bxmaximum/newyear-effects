<?php

declare(strict_types=1);

namespace Newyear\Effects\Internals\Contract;

use Newyear\Effects\Public\Dto\EffectsConfig;

interface ConfigRepositoryInterface
{
    public function getConfig(): EffectsConfig;

    /**
     * @param array<string, mixed> $input
     */
    public function saveFromArray(array $input): EffectsConfig;

    public function getRawCustomColors(): string;

    public function resetToDefaults(): EffectsConfig;
}
