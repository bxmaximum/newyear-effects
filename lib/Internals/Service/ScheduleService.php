<?php

declare(strict_types=1);

namespace Newyear\Effects\Internals\Service;

use Newyear\Effects\Public\Dto\EffectsConfig;

final class ScheduleService
{
    public function isActive(EffectsConfig $config, ?\DateTimeInterface $now = null, bool $isAdmin = false): bool
    {
        if (!$config->enabled) {
            return false;
        }

        if (!$config->hasAnyVisualEffect()) {
            return false;
        }

        return match ($config->scheduleMode) {
            'always' => true,
            'admin_preview' => $isAdmin,
            'dates' => $this->isWithinAnnualRange(
                $config->scheduleStart,
                $config->scheduleEnd,
                $now ?? new \DateTimeImmutable(),
            ),
            default => true,
        };
    }

    public function isWithinAnnualRange(string $startMonthDay, string $endMonthDay, \DateTimeInterface $now): bool
    {
        $current = $now->format('m-d');

        // Обычный диапазон внутри одного года, например 12-01 .. 12-31
        if ($startMonthDay <= $endMonthDay) {
            return $current >= $startMonthDay && $current <= $endMonthDay;
        }

        // Диапазон через границу года, например 12-15 .. 01-15
        return $current >= $startMonthDay || $current <= $endMonthDay;
    }

    /**
     * @param string[] $patterns
     */
    public function isUrlExcluded(string $requestPath, array $patterns): bool
    {
        if ($patterns === []) {
            return false;
        }

        $normalizedPath = '/' . ltrim((string)(parse_url($requestPath, PHP_URL_PATH) ?: $requestPath), '/');

        foreach ($patterns as $pattern) {
            $normalizedPattern = '/' . ltrim($pattern, '/');
            $regex = '#^' . str_replace('\*', '.*', preg_quote($normalizedPattern, '#')) . '$#i';
            if (preg_match($regex, $normalizedPath) === 1) {
                return true;
            }
        }

        return false;
    }
}
