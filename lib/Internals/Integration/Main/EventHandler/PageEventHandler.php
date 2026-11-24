<?php

declare(strict_types=1);

namespace Newyear\Effects\Internals\Integration\Main\EventHandler;

use Bitrix\Main\Context;
use Bitrix\Main\Diag\Logger;
use Bitrix\Main\Diag\LoggerFactory;
use Bitrix\Main\DI\ServiceLocator;
use Bitrix\Main\Page\Asset;
use Bitrix\Main\Page\AssetLocation;
use Bitrix\Main\UI\Extension;
use Bitrix\Main\Web\Json;
use Newyear\Effects\Public\Service\EffectsService;

final class PageEventHandler
{
    public static function onProlog(): void
    {
        $request = Context::getCurrent()->getRequest();

        if ($request->isAdminSection() || $request->isAjaxRequest()) {
            return;
        }

        if (defined('BX_CRONTAB') && BX_CRONTAB === true) {
            return;
        }

        if (defined('REST_API_REQUEST') && REST_API_REQUEST === true) {
            return;
        }

        $isAdmin = isset($GLOBALS['USER'])
            && is_object($GLOBALS['USER'])
            && method_exists($GLOBALS['USER'], 'IsAdmin')
            && $GLOBALS['USER']->IsAdmin();

        try {
            $service = ServiceLocator::getInstance()->get(EffectsService::class);
            $requestUri = (string)$request->getRequestUri();

            $config = $service->getActiveConfig($requestUri, $isAdmin);
            if ($config === null) {
                return;
            }

            Extension::load('newyear.effects.engine');

            $encoded = str_replace('</', '<\/', Json::encode($config->toClientArray()));
            Asset::getInstance()->addString(
                '<script type="application/json" id="newyear-effects-config">' . $encoded . '</script>',
                false,
                AssetLocation::AFTER_JS,
            );
        } catch (\Throwable $exception) {
            self::logFailure($exception);
        }
    }

    private static function logFailure(\Throwable $exception): void
    {
        try {
            $logger = null;
            if (class_exists(LoggerFactory::class)) {
                $logger = (new LoggerFactory())->createById('newyear.effects.public', [], false);
            } elseif (class_exists(Logger::class)) {
                $logger = Logger::create('newyear.effects.public');
            }

            $logger?->error('New Year effects initialization failed.', [
                'exception' => $exception::class,
                'code' => $exception->getCode(),
            ]);
        } catch (\Throwable) {
            // Декоративный модуль не должен прерывать публичную страницу даже при сбое логгера.
        }
    }
}
