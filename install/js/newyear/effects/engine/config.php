<?php

declare(strict_types=1);

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

return [
    'js' => './dist/engine.bundle.js',
    'css' => './dist/engine.bundle.css',
    'rel' => [],
    'skip_core' => false,
];
