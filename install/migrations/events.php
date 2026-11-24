<?php

declare(strict_types=1);

use Bitrix\Main\UpdateSystem\Migration;
use Newyear\Effects\Internals\Integration\Main\EventHandler\PageEventHandler;

Migration::getInstance()->event()
    ->registerCompatible('main', 'OnProlog', PageEventHandler::class, 'onProlog');
