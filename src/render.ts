import {execFileSync} from 'child_process';
import {existsSync} from 'fs';
import * as path from 'path';
import {renderVideo} from '@revideo/renderer';

type Orientation = 'landscape' | 'portrait';

const SIZES: Record<Orientation, {x: number; y: number}> = {
  landscape: {x: 1920, y: 1080},
  portrait: {x: 1080, y: 1920},
};
const FINAL_NAMES: Record<Orientation, string> = {
  landscape: 'cheese-heist_16x9.mp4',
  portrait: 'cheese-heist_9x16.mp4',
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function renderOne(o: Orientation, range?: [number, number], tag?: string) {
  const outDir = path.resolve('output');
  const raw = `raw_${tag ?? 'full'}_${o}.mp4`;
  console.log(`\n=== Rendering ${o}${range ? ` ${range[0]}-${range[1]}s` : ''} ===`);
  await renderVideo({
    projectFile: './src/project.tsx',
    variables: {orientation: o},
    settings: {
      outFile: raw as `${string}.mp4`,
      outDir,
      logProgress: true,
      projectSettings: {
        size: SIZES[o],
        exporter: {name: '@revideo/core/ffmpeg', options: {format: 'mp4'}},
        ...(range ? {range} : {}),
      },
    },
  });

  const rawPath = path.join(outDir, raw);
  const soundtrack = path.resolve('audio/out/soundtrack.wav');
  const final = path.join(outDir, tag ? `${tag}_${o}.mp4` : FINAL_NAMES[o]);
  if (!existsSync(soundtrack)) {
    console.warn('No soundtrack found (run `npm run audio`); output stays silent.');
    return rawPath;
  }
  const from = range ? range[0] : 0;
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-i', rawPath,
      '-ss', String(from), '-i', soundtrack,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-shortest', final,
    ],
    {stdio: 'inherit'},
  );
  console.log(`-> ${final}`);
  return final;
}

async function main() {
  const which = (arg('orientation') ?? 'both') as Orientation | 'both';
  const from = arg('from');
  const to = arg('to');
  const range: [number, number] | undefined =
    from !== undefined && to !== undefined ? [Number(from), Number(to)] : undefined;
  const tag = arg('tag') ?? (range ? `preview_${from}-${to}` : undefined);
  const list: Orientation[] = which === 'both' ? ['landscape', 'portrait'] : [which];
  for (const o of list) await renderOne(o, range, tag);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
