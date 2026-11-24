<?php

declare(strict_types=1);

namespace Bitrix\Main {
    final class Application
    {
        public static function getDocumentRoot(): string
        {
            return (string)$GLOBALS['test_document_root'];
        }
    }

    final class ModuleManager
    {
        public static string|false $mainVersion = '23.0.0';
        public static bool $installed = false;

        public static function getVersion(string $moduleId): string|false
        {
            return $moduleId === 'main' ? self::$mainVersion : false;
        }

        public static function isModuleInstalled(string $moduleId): bool
        {
            return $moduleId === 'newyear.effects' && self::$installed;
        }

        public static function registerModule(string $moduleId): void
        {
            if ($moduleId === 'newyear.effects') {
                self::$installed = true;
            }
        }

        public static function unRegisterModule(string $moduleId): void
        {
            if ($moduleId === 'newyear.effects') {
                self::$installed = false;
            }
        }
    }

    final class EventManager
    {
        private static ?self $instance = null;

        /** @var array<string, true> */
        public array $handlers = [];

        public static function getInstance(): self
        {
            return self::$instance ??= new self();
        }

        public function registerEventHandlerCompatible(
            string $fromModuleId,
            string $eventType,
            string $toModuleId,
            string $toClass,
            string $toMethod,
        ): void
        {
            $this->handlers[$this->key($fromModuleId, $eventType, $toModuleId, $toClass, $toMethod)] = true;
        }

        public function unRegisterEventHandler(
            string $fromModuleId,
            string $eventType,
            string $toModuleId,
            string $toClass,
            string $toMethod,
        ): void
        {
            unset($this->handlers[$this->key($fromModuleId, $eventType, $toModuleId, $toClass, $toMethod)]);
        }

        private function key(string ...$parts): string
        {
            return implode(':', $parts);
        }
    }
}

namespace Bitrix\Main\Config {
    final class Option
    {
        public static bool $deleted = false;

        public static function delete(string $moduleId): void
        {
            self::$deleted = $moduleId === 'newyear.effects';
        }
    }
}

namespace Bitrix\Main\Localization {
    final class Loc
    {
        public static function loadMessages(string $file): void
        {
        }

        /** @param array<string, scalar>|null $replacements */
        public static function getMessage(string $code, ?array $replacements = null): ?string
        {
            return $code;
        }
    }
}

namespace {
    use Bitrix\Main\Config\Option;
    use Bitrix\Main\EventManager;
    use Bitrix\Main\ModuleManager;

    class CModule
    {
        public string $MODULE_VERSION = '';
        public string $MODULE_VERSION_DATE = '';
        public string $MODULE_NAME = '';
        public string $MODULE_DESCRIPTION = '';
        public string $PARTNER_NAME = '';
        public string $PARTNER_URI = '';
    }

    final class TestUser
    {
        public function IsAdmin(): bool
        {
            return true;
        }
    }

    final class TestApplication
    {
        /** @var string[] */
        public array $errors = [];

        public function ThrowException(string $message): void
        {
            $this->errors[] = $message;
        }
    }

    function expectSame(mixed $expected, mixed $actual, string $message): void
    {
        if ($expected !== $actual) {
            throw new RuntimeException($message . ': expected ' . var_export($expected, true)
                . ', got ' . var_export($actual, true));
        }
    }

    $GLOBALS['test_document_root'] = dirname(__DIR__, 2);
    $GLOBALS['USER'] = new TestUser();
    $GLOBALS['APPLICATION'] = new TestApplication();

    require dirname(__DIR__, 2) . '/install/index.php';

    $tests = [
        'rejects main below 23 before changing module state' => static function (): void {
            ModuleManager::$mainVersion = '22.999.0';
            (new newyear_effects())->DoInstall();

            expectSame(false, ModuleManager::$installed, 'module state');
            expectSame(1, count($GLOBALS['APPLICATION']->errors), 'installer errors');
            expectSame([], EventManager::getInstance()->handlers, 'event handlers');
        },
        'installs one fallback event on main 23' => static function (): void {
            ModuleManager::$mainVersion = '23.0.0';
            $installer = new newyear_effects();

            expectSame(true, $installer->InstallDB(), 'first install');
            expectSame(true, $installer->InstallDB(), 'second install');
            expectSame(true, ModuleManager::$installed, 'module state');
            expectSame(1, count(EventManager::getInstance()->handlers), 'event handler count');
        },
        'removes fallback event, options, and module registration' => static function (): void {
            $installer = new newyear_effects();

            expectSame(true, $installer->UnInstallDB(), 'uninstall result');
            expectSame(false, ModuleManager::$installed, 'module state');
            expectSame([], EventManager::getInstance()->handlers, 'event handlers');
            expectSame(true, Option::$deleted, 'module options');
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

    echo sprintf("%d installer tests, %d failures\n", count($tests), $failures);
    exit($failures === 0 ? 0 : 1);
}
