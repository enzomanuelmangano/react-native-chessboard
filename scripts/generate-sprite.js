#!/usr/bin/env node
/**
 * Generates a sprite sheet from individual piece images.
 *
 * Layout: 6x2 grid (6 piece types x 2 colors)
 * Row 0: white pieces (p, n, b, r, q, k)
 * Row 1: black pieces (p, n, b, r, q, k)
 *
 * Usage: node scripts/generate-sprite.js [--cell-size=128]
 *
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

async function generateSprite() {
  // Try to load sharp dynamically
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Error: sharp package is required.');
    console.error('Install it with: npm install sharp --save-dev');
    process.exit(1);
  }

  const assetsDir = path.resolve(__dirname, '../src/assets');
  const outputPath = path.resolve(assetsDir, 'pieces-sprite.png');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let cellSize = 128;

  for (const arg of args) {
    if (arg.startsWith('--cell-size=')) {
      cellSize = parseInt(arg.split('=')[1], 10);
    }
  }

  // Piece order: pawns, knights, bishops, rooks, queens, kings
  const pieceOrder = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors = ['w', 'b'];

  const spriteWidth = cellSize * 6;
  const spriteHeight = cellSize * 2;

  // Create composite operations
  const composites = [];

  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const color = colors[colorIndex];
    for (let pieceIndex = 0; pieceIndex < pieceOrder.length; pieceIndex++) {
      const piece = pieceOrder[pieceIndex];
      const filename = `${color}${piece}.png`;
      const filepath = path.join(assetsDir, filename);

      if (!fs.existsSync(filepath)) {
        console.error(`Error: Missing piece image: ${filename}`);
        process.exit(1);
      }

      composites.push({
        input: filepath,
        left: pieceIndex * cellSize,
        top: colorIndex * cellSize,
      });
    }
  }

  // Create the sprite sheet
  try {
    // Create a transparent base image
    const base = sharp({
      create: {
        width: spriteWidth,
        height: spriteHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    // Resize all input images to cellSize and composite them
    const resizedComposites = await Promise.all(
      composites.map(async (comp) => ({
        input: await sharp(comp.input)
          .resize(cellSize, cellSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
