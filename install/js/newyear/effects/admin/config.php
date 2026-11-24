<?php

declare(strict_types=1);

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

return [
    'js' => './dist/admin.bundle.js',
    'css' => './dist/admin.bundle.css',
    'rel' => [
        'newyear.effects.engine',
    ],
    'skip_core' => false,
];
