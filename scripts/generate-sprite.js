#!/usr/bin/env node
/**
 * Generates a sprite sheet from a set of 12 individual piece images.
 *
 * Layout produced:
 *   6x2 grid (6 piece types x 2 colors)
 *   Row 0: white pieces in order p, n, b, r, q, k
 *   Row 1: black pieces in same order
 *
 * Input directory must contain these filenames:
 *   wp.png wn.png wb.png wr.png wq.png wk.png
 *   bp.png bn.png bb.png br.png bq.png bk.png
 *
 * Usage:
 *   npx react-native-chessboard-generate-sprite \
 *     --input ./my-pieces \
 *     --output ./assets/my-sprite.png \
 *     [--cell-size=128]
 *
 * If --input/--output are omitted the script falls back to the
 * library's own src/assets directory (used when iterating on the
 * bundled sprite during library development).
 *
 * Requires: sharp.
 *   npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const opts = { input: null, output: null, cellSize: 128 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--input=')) opts.input = arg.split('=')[1];
    else if (arg === '--input') opts.input = argv[++i] || null;
    else if (arg.startsWith('--output=')) opts.output = arg.split('=')[1];
    else if (arg === '--output') opts.output = argv[++i] || null;
    else if (arg.startsWith('--cell-size=')) {
      opts.cellSize = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    }
  }
  return opts;
}

function printHelp() {
  console.log(
    [
      '',
      'generate-sprite — compose 12 piece PNGs into a chessboard sprite sheet',
      '',
      'Usage:',
      '  generate-sprite [--input <dir>] [--output <path>] [--cell-size=128]',
      '',
      'Options:',
      '  --input <dir>     Directory containing wp.png ... bk.png (12 files)',
      '  --output <path>   Output sprite PNG path',
      '  --cell-size=N     Cell size in pixels (default: 128)',
      '  -h, --help        Show this help',
      '',
      'Without --input/--output, generates from src/assets in the library',
      'itself (development mode).',
      '',
    ].join('\n')
  );
}

async function generateSprite() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Error: sharp package is required.');
    console.error('Install it with: npm install --save-dev sharp');
    process.exit(1);
  }

  const libAssetsDir = path.resolve(__dirname, '../src/assets');
  const inputDir = opts.input
    ? path.resolve(process.cwd(), opts.input)
    : libAssetsDir;
  const outputPath = opts.output
    ? path.resolve(process.cwd(), opts.output)
    : path.join(libAssetsDir, 'pieces-sprite.png');
  const cellSize = opts.cellSize;

  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    console.error(`Error: invalid --cell-size: ${opts.cellSize}`);
    process.exit(1);
  }

  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    console.error(`Error: input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const pieceOrder = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors = ['w', 'b'];

  const composites = [];
  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    for (let pieceIndex = 0; pieceIndex < pieceOrder.length; pieceIndex++) {
      const piece = pieceOrder[pieceIndex];
      const filename = `${color}${piece}.png`;
      const filepath = path.join(inputDir, filename);
      if (!fs.existsSync(filepath)) {
        console.error(`Error: missing piece image: ${filename}`);
        console.error(`  Expected at: ${filepath}`);
        process.exit(1);
      }
      composites.push({
        input: filepath,
        left: pieceIndex * cellSize,
        top: colorIndex * cellSize,
      });
    }
  }

  const spriteWidth = cellSize * 6;
  const spriteHeight = cellSize * 2;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  try {
    const base = sharp({
      create: {
        width: spriteWidth,
        height: spriteHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    const resizedComposites = await Promise.all(
      composites.map(async (comp) => ({
        input: await sharp(comp.input)
          .resize(cellSize, cellSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        left: comp.left,
        top: comp.top,
      }))
    );

    await base.composite(resizedComposites).png().toFile(outputPath);

    console.log(`Sprite sheet generated: ${outputPath}`);
    console.log(`Size: ${spriteWidth}x${spriteHeight} (${cellSize}px cells)`);
    console.log('Layout:');
    console.log('  Row 0 (white): p  n  b  r  q  k');
    console.log('  Row 1 (black): p  n  b  r  q  k');
  } catch (error) {
    console.error('Error generating sprite sheet:', error);
    process.exit(1);
  }
}

generateSprite();
