// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import path from 'path';
import { createRequire } from 'module';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

describe('tailwind configuration', () => {
  it('exports expected theme and dark mode settings', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(configPath);

    expect(cfg.darkMode).toBe('class');
    expect(Array.isArray(cfg.content)).toBe(true);
    expect(cfg.content.some((s: string) => s.includes('client/index.html'))).toBe(true);
    expect(cfg.theme?.extend?.fontFamily?.sans?.[0]).toContain('SF Pro Text');
    expect(cfg.theme?.extend?.colors?.primary?.[500]).toBe('#3b82f6');
    expect(cfg.theme?.extend?.borderRadius?.md).toBe('8px');
  });

  it('postcss includes tailwind and autoprefixer', async () => {
    const require = createRequire(import.meta.url);
    const postcssConfigPath = path.resolve(process.cwd(), 'postcss.config.cjs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pc = require(postcssConfigPath);
    expect(pc.plugins).toBeTruthy();
    expect(Object.keys(pc.plugins)).toContain('tailwindcss');
    expect(Object.keys(pc.plugins)).toContain('autoprefixer');
  });

  it('compiles utilities using our theme (rounded-md = 8px, blue primary)', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="bg-primary-500 rounded-md shadow-md dark:bg-slate-900"></div>',
        },
      ],
    };

    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.bg-primary-500/);
    expect(css).toMatch(/\.rounded-md\s*\{/);
    expect(css).toMatch(/border-radius:\s*8px/);
    expect(css).toMatch(/\.shadow-md/);
    expect(css).toMatch(/\.dark\\:bg-slate-900:is\(\.dark \*\)/);
  });

  it('index.css contains tailwind directives', async () => {
    const require = createRequire(import.meta.url);
    const fs = require('fs') as typeof import('fs');
    const cssPath = path.resolve(process.cwd(), 'src', 'index.css');
    const content = fs.readFileSync(cssPath, 'utf8');
    expect(content).toContain('@tailwind base');
    expect(content).toContain('@tailwind components');
    expect(content).toContain('@tailwind utilities');
  });

  it('font-sans utility uses our SF Pro Text font stack', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<p class="font-sans">Hello</p>',
        },
      ],
    };

    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.font-sans/);
    expect(css).toMatch(/font-family:\s*\"SF Pro Text\"/);
  });

  it('rounded-lg equals 8px (theme radius)', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="rounded-lg"></div>',
        },
      ],
    };

    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.rounded-lg\s*\{/);
    expect(css).toMatch(/border-radius:\s*8px/);
  });

  it('primary color shades compile for multiple utilities (bg/text)', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="bg-primary-600 text-primary-700"></div>',
        },
      ],
    };

    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.bg-primary-600/);
    expect(css).toMatch(/\.text-primary-700/);
  });

  it('base preflight is included when compiling @tailwind base', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const input = '@tailwind base;';
    const result = await postcss([tailwindcss(baseCfg)]).process(input, { from: undefined });
    const css = result.css;
    // Look for the universal selector preflight block
    expect(css).toMatch(/\*,\s*::before,\s*::after/);
    expect(css.length).toBeGreaterThan(1000);
  });

  it('index.css defines custom CSS variables for layout hooks', async () => {
    const require = createRequire(import.meta.url);
    const fs = require('fs') as typeof import('fs');
    const cssPath = path.resolve(process.cwd(), 'src', 'index.css');
    const content = fs.readFileSync(cssPath, 'utf8');
    expect(content).toContain('--tile-min');
    expect(content).toContain('--grid-gap');
  });

  it('JIT tree-shakes unused utilities (only emits what content uses)', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="rounded-md"></div>',
        },
      ],
    };
    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.rounded-md/);
    expect(css).not.toMatch(/\.rounded-lg/);
    expect(css).not.toMatch(/\.bg-primary-500/);
  });

  it('accent colors generate utilities (bg-accent-amber, text-accent-rose)', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="bg-accent-amber text-accent-rose"></div>',
        },
      ],
    };
    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.bg-accent-amber/);
    expect(css).toMatch(/background-color:\s*rgb\(/);
    expect(css).toMatch(/\.text-accent-rose/);
  });

  it('shadow-md uses our custom shadow value', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="shadow-md"></div>',
        },
      ],
    };
    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.shadow-md/);
    expect(css).toMatch(/0 6px 14px rgba\(0,0,0,0\.08\)/);
  });

  it('rounded-xl equals 12px', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="rounded-xl"></div>',
        },
      ],
    };
    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.rounded-xl/);
    expect(css).toMatch(/border-radius:\s*12px/);
  });

  it('text-2xl utility compiles with font-size and line-height', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<h1 class="text-2xl">Title</h1>',
        },
      ],
    };
    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    expect(css).toMatch(/\.text-2xl/);
    expect(css).toMatch(/font-size:\s*1\.5rem/);
    expect(css).toMatch(/line-height:\s*2rem/);
  });

  it('arbitrary values compile (min-h-[123px])', async () => {
    const require = createRequire(import.meta.url);
    const configPath = path.resolve(process.cwd(), '..', 'tailwind.config.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseCfg = require(configPath);
    const cfg = {
      ...baseCfg,
      content: [
        {
          raw: '<div class="min-h-[123px]"></div>',
        },
      ],
    };
    const input = '@tailwind utilities;';
    const result = await postcss([tailwindcss(cfg)]).process(input, { from: undefined });
    const css = result.css;
    // Tailwind escapes arbitrary values in class names in the emitted CSS
    expect(css).toMatch(/\.min-h-\\\[123px\\\]/);
    expect(css).toMatch(/min-height:\s*123px/);
  });
});



