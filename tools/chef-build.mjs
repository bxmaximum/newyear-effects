import { spawnSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionRoot = join(moduleRoot, 'install', 'js', 'newyear', 'effects');
const requested = process.argv.slice(2);
const action = requested[0] === '--lint' ? 'lint' : 'build';
if (action === 'lint')
{
	requested.shift();
}
const extensions = requested.length > 0
	? requested
	: ['newyear.effects.engine', 'newyear.effects.admin'];
const allowed = new Set(['newyear.effects.engine', 'newyear.effects.admin']);

for (const extension of extensions)
{
	if (!allowed.has(extension))
	{
		throw new Error(`Unsupported extension: ${extension}`);
	}
}

const projectRoot = mkdtempSync(join(tmpdir(), 'newyear-effects-chef-'));
const projectExtensions = join(projectRoot, 'local', 'js', 'newyear', 'effects');

try
{
	mkdirSync(join(projectRoot, 'bitrix'), { recursive: true });
	writeFileSync(join(projectRoot, 'index.php'), '<?php\n');
	writeFileSync(join(projectRoot, 'urlrewrite.php'), '<?php\n');
	cpSync(extensionRoot, projectExtensions, { recursive: true });

	if (action === 'build')
	{
		for (const extension of extensions)
		{
			const shortName = extension.split('.').at(-1);
			rmSync(join(projectExtensions, shortName, 'dist'), { recursive: true, force: true });
		}
	}

	const chefBin = join(moduleRoot, 'node_modules', '@bitrix', 'chef', 'bin', 'chef');
	const chefArgs = action === 'lint'
		? [chefBin, 'lint', ...extensions, '--no-cache']
		: [chefBin, 'build', ...extensions];
	const result = spawnSync(process.execPath, chefArgs, {
		cwd: projectRoot,
		stdio: 'inherit',
	});

	if (result.status !== 0)
	{
		process.exitCode = result.status ?? 1;
	}
	else if (action === 'build')
	{
		for (const extension of extensions)
		{
			const shortName = extension.split('.').at(-1);
			const builtDist = join(projectExtensions, shortName, 'dist');
			const expectedJs = join(builtDist, `${shortName}.bundle.js`);
			const expectedCss = join(builtDist, `${shortName}.bundle.css`);

			if (!existsSync(expectedJs) || !existsSync(expectedCss))
			{
				throw new Error(`Chef did not create both bundles for ${extension}`);
			}

			const outputDist = join(extensionRoot, shortName, 'dist');
			rmSync(outputDist, { recursive: true, force: true });
			cpSync(builtDist, outputDist, { recursive: true });

			const unexpected = readdirSync(outputDist).filter((file) => ![
				`${shortName}.bundle.js`,
				`${shortName}.bundle.css`,
			].includes(file));
			if (unexpected.length > 0)
			{
				throw new Error(`Unexpected build artifacts for ${extension}: ${unexpected.join(', ')}`);
			}
		}
	}
}
finally
{
	rmSync(projectRoot, { recursive: true, force: true });
}
