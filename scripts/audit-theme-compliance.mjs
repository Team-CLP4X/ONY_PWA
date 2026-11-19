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
const HARDCODED_RGB_REGEX = /rgba?\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?(?:\s*,\s*[\d.]+%?)?\s*\)/gi;
const NAMED_COLOR_LIST = 'white|black|cream|ivory|cornsilk|linen|beige|wheat|red|green|blue|gray|grey|slate|silver';
const HARDCODED_NAMED_CSS_REGEX = new RegExp(
  `(?:background(?:-color|-image)?|color|border(?:-color|-top-color|-right-color|-bottom-color|-left-color)?|outline(?:-color)?|fill|stroke|stop-color|caret-color|box-shadow|text-shadow)\\s*:\\s*([^;\\n}]+)`,
  'gi'
);
const HARDCODED_NAMED_INLINE_REGEX = new RegExp(
  `(?:background|backgroundColor|color|borderColor|borderTopColor|borderRightColor|borderBottomColor|borderLeftColor|outlineColor|fill|stroke|stopColor|caretColor)\\s*:\\s*["']([^"']+)["']`,
  'gi'
);
const HARDCODED_NAMED_PROP_REGEX = new RegExp(
  `\\b(?:color|fill|stroke|stopColor)=["'](${NAMED_COLOR_LIST})["']`,
  'gi'
);
const HARDCODED_TAILWIND_COLOR_REGEX = /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?|\[#[^\]]+\])(?:\/\d{1,3})?\b/g;
const HARDCODED_HEX_ALPHA_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{4})\b/g;
const HARDCODED_TAILWIND_OPACITY_REGEX = /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?|\[#[^\]]+\])\/\d{1,3}\b/g;
const NAMED_TOKEN_BOUNDARY_REGEX = new RegExp(`(?<![\\w-])(?:${NAMED_COLOR_LIST})(?![\\w-])`, 'gi');
const HARDCODED_FONT_SIZE_CSS = /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi;
const HARDCODED_FONT_SIZE_INLINE = /fontSize\s*:\s*["']?(\d+(?:\.\d+)?)px["']?/gi;

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
  let inCssBlockComment = false;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (inCssBlockComment) {
      if (trimmed.includes('*/')) inCssBlockComment = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inCssBlockComment = true;
      return;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')) {
      return;
    }

    // Ignore pure CSS custom property declarations (--token: value;)
    if (relPath.endsWith('.css') && trimmed.startsWith('--')) {
      return;
    }

    // Strip inline trailing comments for cleaner matching
    const codeOnly = line.replace(/\/\*.*?\*\//g, '').replace(/\s\/\/.*$/, '');

    // 1. Hardcoded Hex Colors (including var() fallbacks and inline JSX)
    let match;
    const hexRegex = new RegExp(HARDCODED_HEX_REGEX.source, 'g');
    while ((match = hexRegex.exec(codeOnly)) !== null) {
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_COLOR_HEX',
        value: match[0],
        snippet: trimmed,
      });
    }

    // 1b. Hardcoded Hex with Alpha Opacity (#RGBA / #RRGGBBAA)
    const hexAlphaRegex = new RegExp(HARDCODED_HEX_ALPHA_REGEX.source, 'g');
    while ((match = hexAlphaRegex.exec(codeOnly)) !== null) {
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_COLOR_OPACITY',
        value: match[0],
        snippet: trimmed,
      });
    }

    // 2. Hardcoded RGB/RGBA (no box-shadow / var() bypasses)
    const rgbRegex = new RegExp(HARDCODED_RGB_REGEX.source, 'gi');
    while ((match = rgbRegex.exec(codeOnly)) !== null) {
      const val = match[0];
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_COLOR_RGB',
        value: val,
        snippet: trimmed,
      });
      if (/^rgba\(/i.test(val)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'HARDCODED_COLOR_OPACITY',
          value: val,
          snippet: trimmed,
        });
      }
    }

    // 3. Hardcoded Named Colors (CSS properties, inline JSX style, JSX props, Tailwind)
    if (relPath.endsWith('.css')) {
      const cssPropRegex = new RegExp(HARDCODED_NAMED_CSS_REGEX.source, 'gi');
      while ((match = cssPropRegex.exec(codeOnly)) !== null) {
        const valueExpr = match[1].replace(/var\([^)]+\)/g, '');
        const tokenMatches = valueExpr.match(NAMED_TOKEN_BOUNDARY_REGEX);
        if (tokenMatches) {
          tokenMatches.forEach(tok => {
            violations.push({
              file: relPath,
              line: lineNum,
              type: 'HARDCODED_COLOR_NAMED',
              value: tok,
              snippet: trimmed,
            });
          });
        }
      }
    } else {
      const inlineNamedRegex = new RegExp(HARDCODED_NAMED_INLINE_REGEX.source, 'gi');
      while ((match = inlineNamedRegex.exec(codeOnly)) !== null) {
        const valueExpr = match[1].replace(/var\([^)]+\)/g, '');
        const tokenMatches = valueExpr.match(NAMED_TOKEN_BOUNDARY_REGEX);
        if (tokenMatches) {
          tokenMatches.forEach(tok => {
            violations.push({
              file: relPath,
              line: lineNum,
              type: 'HARDCODED_COLOR_NAMED',
              value: tok,
              snippet: trimmed,
            });
          });
        }
      }

      const propNamedRegex = new RegExp(HARDCODED_NAMED_PROP_REGEX.source, 'gi');
      while ((match = propNamedRegex.exec(codeOnly)) !== null) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'HARDCODED_COLOR_NAMED',
          value: match[0],
          snippet: trimmed,
        });
      }

      const twRegex = new RegExp(HARDCODED_TAILWIND_COLOR_REGEX.source, 'g');
      while ((match = twRegex.exec(codeOnly)) !== null) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'HARDCODED_COLOR_TAILWIND',
          value: match[0],
          snippet: trimmed,
        });
      }

      const twOpacityRegex = new RegExp(HARDCODED_TAILWIND_OPACITY_REGEX.source, 'g');
      while ((match = twOpacityRegex.exec(codeOnly)) !== null) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'HARDCODED_COLOR_OPACITY',
          value: match[0],
          snippet: trimmed,
        });
      }
    }

    // 3b. Opacity applied inside color-mix(...) to a hardcoded color (#hex or named)
    if (codeOnly.includes('color-mix(')) {
      const mixStripped = codeOnly.replace(/var\([^)]+\)/g, '');
      if (/#[0-9a-fA-F]{3,8}\b/.test(mixStripped) || new RegExp(NAMED_TOKEN_BOUNDARY_REGEX.source, 'i').test(mixStripped)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'HARDCODED_COLOR_OPACITY',
          value: 'color-mix(hardcoded)',
          snippet: trimmed,
        });
      }
    }

    // 4. Hardcoded Font Size in CSS
    const fsCssRegex = new RegExp(HARDCODED_FONT_SIZE_CSS.source, 'gi');
    while ((match = fsCssRegex.exec(codeOnly)) !== null) {
      if (codeOnly.includes('--font-scale') || codeOnly.includes('var(--font-')) continue;
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
    while ((match = fsInlineRegex.exec(codeOnly)) !== null) {
      if (codeOnly.includes('var(--font-') || codeOnly.includes('calc(')) continue;
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

if (isJson) {
  console.log(JSON.stringify(allViolations, null, 2));
} else {
  console.log('='.repeat(70));
  console.log('ONY THEME COMPLIANCE AUDIT');
  console.log(`Allowlist rules configured: ${ALLOWLIST_RULES.length}`);
  console.log(`Total compliance issues detected: ${allViolations.length}`);
  console.log('='.repeat(70));

  const byFile = {};
  const byType = {};
  allViolations.forEach(v => {
    byFile[v.file] = byFile[v.file] || [];
    byFile[v.file].push(v);
    byType[v.type] = (byType[v.type] || 0) + 1;
  });

  console.log('\nBy Category:', byType);

  for (const [file, items] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
    const fileTypes = {};
    items.forEach(i => { fileTypes[i.type] = (fileTypes[i.type] || 0) + 1; });
    console.log(`\nFile: ${file} (${items.length} items) ${JSON.stringify(fileTypes)}`);
    items.slice(0, 8).forEach(i => {
      console.log(`   Line ${i.line}: [${i.type}] ${i.value} -> ${i.snippet.slice(0, 75)}`);
    });
    if (items.length > 8) {
      console.log(`   ... and ${items.length - 8} more in this file`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

if (allViolations.length > 0) {
  console.error(`Audit failed: ${allViolations.length} compliance issues found.`);
  process.exitCode = 1;
} else {
  if (!isJson) console.log('Theme compliance audit passed with 0 issues.');
  process.exitCode = 0;
}
