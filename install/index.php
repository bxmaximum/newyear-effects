<?php

declare(strict_types=1);

use Bitrix\Main\Application;
use Bitrix\Main\Config\Option;
use Bitrix\Main\EventManager;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\ModuleManager;
use Newyear\Effects\Internals\Integration\Main\EventHandler\PageEventHandler;

Loc::loadMessages(__FILE__);

class newyear_effects extends CModule
{
    private const MIN_MAIN_VERSION = '23.0.0';

    public $MODULE_ID = 'newyear.effects';

    public function __construct()
    {
        $arModuleVersion = [];
        include __DIR__ . '/version.php';

        $this->MODULE_VERSION = $arModuleVersion['VERSION'];
        $this->MODULE_VERSION_DATE = $arModuleVersion['VERSION_DATE'];
        $this->MODULE_NAME = Loc::getMessage('NEWYEAR_EFFECTS_MODULE_NAME') ?: 'Новогодние эффекты';
        $this->MODULE_DESCRIPTION = Loc::getMessage('NEWYEAR_EFFECTS_MODULE_DESC') ?: '';
        $this->PARTNER_NAME = 'BXMax';
        $this->PARTNER_URI = 'https://bxmax.ru';
    }

    public function DoInstall(): void
    {
        if (!$GLOBALS['USER']->IsAdmin()) {
            return;
        }

        $mainVersion = ModuleManager::getVersion('main');
        if (!is_string($mainVersion) || version_compare($mainVersion, self::MIN_MAIN_VERSION, '<')) {
            $GLOBALS['APPLICATION']->ThrowException(
                Loc::getMessage('NEWYEAR_EFFECTS_INSTALL_MAIN_VERSION_ERROR', [
                    '#VERSION#' => self::MIN_MAIN_VERSION,
                ]) ?: 'Bitrix main 23.0.0 or newer is required.',
            );

            return;
        }

        if ($this->InstallFiles()) {
            $this->InstallDB();
        }
    }

    public function DoUninstall(): void
    {
        if (!$GLOBALS['USER']->IsAdmin()) {
            return;
        }

        if ($this->UnInstallDB()) {
            $this->UnInstallFiles();
        }
    }

    public function InstallDB(): bool
    {
        // Since main 26.600*: декларативные миграции установщика из install/migrations/events.php
        if (method_exists($this, 'installMigrations')) {
            try {
                $result = $this->installMigrations();
            } catch (\Throwable $exception) {
                $GLOBALS['APPLICATION']->ThrowException($exception->getMessage());

                return false;
            }

            if (!$result->isSuccess()) {
                $GLOBALS['APPLICATION']->ThrowException(implode('<br>', $result->getErrorMessages()));

                return false;
            }

            if (!ModuleManager::isModuleInstalled($this->MODULE_ID)) {
                ModuleManager::registerModule($this->MODULE_ID);
            }

            return true;
        }

        // На main 23.0–26.599 декларативные миграции установщика ещё недоступны.
        if (!ModuleManager::isModuleInstalled($this->MODULE_ID)) {
            ModuleManager::registerModule($this->MODULE_ID);
        }

        return $this->InstallEvents();
    }

    public function UnInstallDB(): bool
    {
        if (method_exists($this, 'uninstallMigrations')) {
            try {
                $result = $this->uninstallMigrations(false);
            } catch (\Throwable $exception) {
                $GLOBALS['APPLICATION']->ThrowException($exception->getMessage());

                return false;
            }

            if (!$result->isSuccess()) {
                $GLOBALS['APPLICATION']->ThrowException(implode('<br>', $result->getErrorMessages()));

                return false;
            }
        } elseif (!$this->UnInstallEvents()) {
            return false;
        }

        Option::delete($this->MODULE_ID);
        ModuleManager::unRegisterModule($this->MODULE_ID);

        return true;
    }

    public function InstallEvents(): bool
    {
        EventManager::getInstance()->registerEventHandlerCompatible(
            fromModuleId: 'main',
            eventType: 'OnProlog',
            toModuleId: $this->MODULE_ID,
            toClass: PageEventHandler::class,
            toMethod: 'onProlog',
        );

        return true;
    }

    public function UnInstallEvents(): bool
    {
        EventManager::getInstance()->unRegisterEventHandler(
            fromModuleId: 'main',
            eventType: 'OnProlog',
            toModuleId: $this->MODULE_ID,
            toClass: PageEventHandler::class,
            toMethod: 'onProlog',
        );

        return true;
    }

    public function InstallFiles(): bool
    {
        $sourceDirectory = __DIR__ . '/js/newyear/effects';
        $targetDirectory = Application::getDocumentRoot() . '/local/js/newyear/effects';
        $copied = CopyDirFiles(
            __DIR__ . '/js',
            Application::getDocumentRoot() . '/local/js',
            true,
            true,
        );

        $requiredFiles = [
            '/engine/config.php',
            '/engine/dist/engine.bundle.js',
            '/engine/dist/engine.bundle.css',
            '/admin/config.php',
            '/admin/dist/admin.bundle.js',
            '/admin/dist/admin.bundle.css',
        ];

        foreach ($requiredFiles as $relativePath) {
            $sourceFile = $sourceDirectory . $relativePath;
            $targetFile = $targetDirectory . $relativePath;
            if (
                !$copied
                || !is_file($targetFile)
                || hash_file('sha256', $sourceFile) !== hash_file('sha256', $targetFile)
            ) {
                $GLOBALS['APPLICATION']->ThrowException(
                    Loc::getMessage('NEWYEAR_EFFECTS_INSTALL_FILES_ERROR') ?: 'Cannot install New Year Effects assets.',
                );

                return false;
            }
        }

        return true;
    }

    public function UnInstallFiles(): bool
    {
        DeleteDirFilesEx('/local/js/newyear/effects');

        return true;
    }
}
