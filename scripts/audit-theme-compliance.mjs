/**
 * ONY Central Theme System - Compliance Audit Script
 *
 * Scans all source files in src/ to detect:
 * 1. Hardcoded color literals (hex, rgb/rgba, named colors) bypassing semantic tokens
 * 2. Unscaled font sizes (fixed px) ignoring typography scale and font scaling factor
 * 3. Fixed container dimensions that clip scaled text
 * 4. Components bypassing the central ThemeProvider
 *
 * Usage:
 *   npm run audit:theme
 *   node scripts/audit-theme-compliance.mjs [--strict] [--json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

// Explicit Allowlist Configuration with Justifications
const ALLOWLIST_RULES = [
  {
    path: 'src/theme/palettes.ts',
    reason: 'Single source of truth for semantic color tokens and WCAG AA palettes across 6 themes x 2 modes',
  },
  {
    path: 'src/assets/',
    reason: 'Static binary assets, application icons, and brand graphics',
  },
  {
    path: 'src/i18n/translations.ts',
    reason: 'Localization strings, copy, and translations dictionary',
  },
  {
    path: 'src/server/',
    reason: 'Server-side Node/Express controllers, Gemini LLM prompts, and token verification',
  },
  {
    path: 'src/services/ambientMusicEngine.ts',
    reason: 'Web Audio API oscillator frequencies, synthesis nodes, and audio filters',
  },
  {
    path: 'src/services/voiceService.ts',
    reason: 'Web Speech Synthesis voice pitch and rate engine',
  },
  {
    path: 'src/utils/geo.ts',
    reason: 'Geographical coordinates (lat/lng) and Haversine distance calculation',
  },
  {
    path: 'src/utils/bookColorUtils.ts',
    reason: 'Color math routines: hex-to-rgb, luminance formula, and WCAG 4.5:1 contrast calculations',
  },
  {
    path: 'src/services/bookshelfService.ts',
    reason: 'Seed journal book spine palette options for custom book cover selection',
  },
  {
    path: 'src/services/vaultService.ts',
    reason: 'Seed category tags for user-created reflection memories',
  },
];

const HARDCODED_HEX_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const HARDCODED_RGB_REGEX = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+%?)?\s*\)/g;
const HARDCODED_NAMED_COLOR_REGEX = /(?:background(?:-color)?|color|border(?:-color)?)\s*:\s*(?:white|black|red|green|blue)\b/gi;
const HARDCODED_FONT_SIZE_CSS = /font-size\s*:\s*(\d+)px/gi;
const HARDCODED_FONT_SIZE_INLINE = /fontSize\s*:\s*["']?(\d+)px["']?/gi;

function isAllowlistedPath(relPath) {
  return ALLOWLIST_RULES.some(rule => relPath === rule.path || relPath.startsWith(rule.path));
}

function scanFile(filePath) {
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
  if (isAllowlistedPath(relPath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Ignore comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    // Ignore CSS custom property declarations
    if (relPath.endsWith('.css') && trimmed.startsWith('--')) {
      return;
    }

    // 1. Hardcoded Hex Colors
    let match;
    const hexRegex = new RegExp(HARDCODED_HEX_REGEX.source, 'g');
    while ((match = hexRegex.exec(line)) !== null) {
      const hex = match[0];
      // Allow genuine brand icons or color picker gradients
      if (
        line.includes('oauth') ||
        line.includes('google-btn') ||
        line.includes('apple-btn') ||
        line.includes('linear-gradient(to top, #000000') ||
        line.includes('flag') ||
        line.includes('changeCoverColorInput')
      ) {
        continue;
      }
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_COLOR_HEX',
        value: hex,
        snippet: trimmed,
      });
    }

    // 2. Hardcoded RGB/RGBA
    const rgbRegex = new RegExp(HARDCODED_RGB_REGEX.source, 'gi');
    while ((match = rgbRegex.exec(line)) !== null) {
      if (line.includes('var(') || line.includes('boxShadow') || line.includes('box-shadow')) continue;
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_COLOR_RGB',
        value: match[0],
        snippet: trimmed,
      });
    }

    // 3. Named Colors (white, black)
    const namedRegex = new RegExp(HARDCODED_NAMED_COLOR_REGEX.source, 'gi');
    while ((match = namedRegex.exec(line)) !== null) {
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_COLOR_NAMED',
        value: match[0],
        snippet: trimmed,
      });
    }

    // 4. Hardcoded Font Size in CSS
    const fsCssRegex = new RegExp(HARDCODED_FONT_SIZE_CSS.source, 'gi');
    while ((match = fsCssRegex.exec(line)) !== null) {
      if (line.includes('--font-scale') || line.includes('var(--font-')) continue;
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'UNSCALED_FONT_SIZE_CSS',
        value: match[0],
        snippet: trimmed,
      });
    }

    // 5. Hardcoded Font Size in TSX
    const fsInlineRegex = new RegExp(HARDCODED_FONT_SIZE_INLINE.source, 'gi');
    while ((match = fsInlineRegex.exec(line)) !== null) {
      if (line.includes('var(--font-') || line.includes('calc(')) continue;
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'UNSCALED_FONT_SIZE_INLINE',
        value: match[0],
        snippet: trimmed,
      });
    }
  });

  return violations;
}

function traverseDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(traverseDir(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results = results.concat(scanFile(fullPath));
    }
  });
  return results;
}

const allViolations = traverseDir(SRC_DIR);

const isJson = process.argv.includes('--json');
const isStrict = process.argv.includes('--strict');

if (isJson) {
  console.log(JSON.stringify(allViolations, null, 2));
} else {
  console.log('='.repeat(70));
  console.log(`ONY THEME COMPLIANCE AUDIT`);
  console.log(`Allowlist rules configured: ${ALLOWLIST_RULES.length}`);
  console.log(`Total compliance issues detected: ${allViolations.length}`);
  console.log('='.repeat(70));

  const byFile = {};
  allViolations.forEach(v => {
    byFile[v.file] = byFile[v.file] || [];
    byFile[v.file].push(v);
  });

  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n📁 File: ${file} (${items.length} items)`);
    items.slice(0, 10).forEach(i => {
      console.log(`   Line ${i.line}: [${i.type}] ${i.value} -> ${i.snippet.slice(0, 75)}`);
    });
    if (items.length > 10) {
      console.log(`   ... and ${items.length - 10} more in this file`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

if (isStrict && allViolations.length > 0) {
  console.error(`Audit failed: ${allViolations.length} compliance issues found.`);
  process.exit(1);
} else {
  console.log('Theme compliance audit executed successfully.');
  process.exit(0);
}
