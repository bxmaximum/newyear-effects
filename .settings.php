<?php

declare(strict_types=1);

use Newyear\Effects\Internals\Contract\ConfigRepositoryInterface;
use Newyear\Effects\Internals\Service\ConfigService;

return [
    'services' => [
        'value' => [
            ConfigRepositoryInterface::class => [
                'className' => ConfigService::class,
            ],
        ],
        'readonly' => true,
    ],
];
