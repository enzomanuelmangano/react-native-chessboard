import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';

const SCRIPT = path.resolve(__dirname, '../../scripts/generate-sprite.js');
const PIECES = ['p', 'n', 'b', 'r', 'q', 'k'] as const;
const COLORS = ['w', 'b'] as const;

const ALL_FILENAMES = COLORS.flatMap((c) => PIECES.map((p) => `${c}${p}.png`));

const makeFixturePiece = async (filepath: string, color: 'w' | 'b') => {
  // Solid square so we can detect it composited correctly. White pieces
  // get a red tile, black pieces get a blue tile — distinct enough to
  // verify position via pixel sampling if a future test wants to.
  const r = color === 'w' ? 255 : 0;
  const b = color === 'b' ? 255 : 0;
  await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r, g: 0, b, alpha: 255 },
    },
  })
    .png()
    .toFile(filepath);
};

const populateFixtureDir = async (
  dir: string,
  filenames: readonly string[] = ALL_FILENAMES
) => {
  fs.mkdirSync(dir, { recursive: true });
  for (const filename of filenames) {
    const color = filename[0] as 'w' | 'b';
    await makeFixturePiece(path.join(dir, filename), color);
  }
};

const runScript = (
  args: string[]
): { status: number; stdout: string; stderr: string } => {
  const result = spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

describe('generate-sprite CLI', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-sprite-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('prints usage and exits 0 on --help', () => {
    const { status, stdout } = runScript(['--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('generate-sprite');
    expect(stdout).toContain('--input');
    expect(stdout).toContain('--output');
    expect(stdout).toContain('--cell-size');
  });

  it('produces a 768x256 sheet from a complete fixture dir at default cell size', async () => {
    const inputDir = path.join(tmpRoot, 'pieces');
    const outputPath = path.join(tmpRoot, 'sprite.png');
    await populateFixtureDir(inputDir);

    const { status } = runScript(['--input', inputDir, '--output', outputPath]);

    expect(status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const meta = await sharp(outputPath).metadata();
    expect(meta.width).toBe(768); // 6 cols * 128
    expect(meta.height).toBe(256); // 2 rows * 128
  });

  it('honors --cell-size for output dimensions', async () => {
    const inputDir = path.join(tmpRoot, 'pieces');
    const outputPath = path.join(tmpRoot, 'sprite.png');
    await populateFixtureDir(inputDir);

    const { status } = runScript([
      '--input',
      inputDir,
      '--output',
      outputPath,
      '--cell-size=64',
    ]);

    expect(status).toBe(0);
    const meta = await sharp(outputPath).metadata();
    expect(meta.width).toBe(64 * 6);
    expect(meta.height).toBe(64 * 2);
  });

  it('creates intermediate output directories', async () => {
    const inputDir = path.join(tmpRoot, 'pieces');
    const outputPath = path.join(tmpRoot, 'nested', 'a', 'b', 'sprite.png');
    await populateFixtureDir(inputDir);

    const { status } = runScript(['--input', inputDir, '--output', outputPath]);

    expect(status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('fails with exit 1 when the input directory does not exist', () => {
    const inputDir = path.join(tmpRoot, 'missing');
    const outputPath = path.join(tmpRoot, 'sprite.png');

    const { status, stderr } = runScript([
      '--input',
      inputDir,
      '--output',
      outputPath,
    ]);

    expect(status).toBe(1);
    expect(stderr).toContain('input directory not found');
  });

  it('fails with exit 1 when a required piece file is missing', async () => {
    const inputDir = path.join(tmpRoot, 'pieces');
    const outputPath = path.join(tmpRoot, 'sprite.png');
    // Skip the white queen on purpose
    const incomplete = ALL_FILENAMES.filter((f) => f !== 'wq.png');
    await populateFixtureDir(inputDir, incomplete);

    const { status, stderr } = runScript([
      '--input',
      inputDir,
      '--output',
      outputPath,
    ]);

    expect(status).toBe(1);
    expect(stderr).toContain('missing piece image');
    expect(stderr).toContain('wq.png');
  });

  it('rejects an invalid --cell-size value', async () => {
    const inputDir = path.join(tmpRoot, 'pieces');
    const outputPath = path.join(tmpRoot, 'sprite.png');
    await populateFixtureDir(inputDir);

    const { status, stderr } = runScript([
      '--input',
      inputDir,
      '--output',
      outputPath,
      '--cell-size=abc',
    ]);

    expect(status).toBe(1);
    expect(stderr).toContain('invalid --cell-size');
  });
});
