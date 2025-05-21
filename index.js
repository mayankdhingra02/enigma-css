#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const cheerio = require('cheerio');

// external helpers
const { getAllFiles } = require('./src/fileScanner');
const { createMapping } = require('./src/mapGenerator');
const { obfuscateCSS, obfuscateHTML } = require('./src/obfuscator');

const args = process.argv.slice(2);

const namespaceArg = args.find(arg => arg.startsWith('--namespace='));
const namespace = namespaceArg ? namespaceArg.split('=')[1] : 'default';

const pathArg = args.find(arg => arg.startsWith('--path='));
const inputPath = path.resolve(pathArg ? pathArg.split('=')[1] : process.cwd());

const isReverse = args.includes('--reverse');

// 🔁 Reverse helpers
function reverseMapping(mapping) {
  const reversed = {};
  for (const [original, obf] of Object.entries(mapping)) {
    reversed[obf] = original.split('::')[1]; // get only the original name
  }
  return reversed;
}

function reverseCSS(filePath, reverseMap) {
  const css = fs.readFileSync(filePath, 'utf8');
  const updated = css.replace(/([.#])cls_[a-zA-Z0-9_]+/g, (match, symbol) => {
    const token = match.slice(1); // strip . or #
    return reverseMap[token] ? `${symbol}${reverseMap[token]}` : match;
  });
  fs.writeFileSync(filePath, updated);
}

// function reverseHTML(filePath, reverseMap) {
//   let html = fs.readFileSync(filePath, 'utf8');

//   html = html.replace(/class="([^"]+)"/g, (_, classStr) => {
//     const restored = classStr
//       .split(/\s+/)
//       .map(cls => reverseMap[cls] || cls)
//       .join(' ');
//     return `class="${restored}"`;
//   });

//   html = html.replace(/id="([^"]+)"/g, (_, idVal) => {
//     const restored = reverseMap[idVal] || idVal;
//     return `id="${restored}"`;
//   });

//   fs.writeFileSync(filePath, html);
// }

// 🔍 Extract .class or #id names from CSS selectors
function reverseHTML(filePath, reverseMap) {
    let html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });
  
    $('[class], [id]').each((_, el) => {
      const original = $(el).toString();
      const attrs = el.attribs;
  
      let updated = original;
  
      if (attrs.class) {
        const classes = attrs.class.split(/\s+/);
        const newClasses = classes.map(cls => reverseMap[cls] || cls).join(' ');
        updated = updated.replace(`class="${attrs.class}"`, `class="${newClasses}"`);
      }
  
      if (attrs.id) {
        const newId = reverseMap[attrs.id];
        if (newId) {
          updated = updated.replace(`id="${attrs.id}"`, `id="${newId}"`);
        }
      }
  
      // Replace only the element string, not the whole HTML
      html = html.replace(original, updated);
    });
  
    fs.writeFileSync(filePath, html);
  }
  
async function extractClassNames(filePath, classSet) {
  const css = fs.readFileSync(filePath, 'utf8');
  await postcss([
    root => {
      root.walkRules(rule => {
        rule.selectors.forEach(selector => {
          const matches = selector.match(/([.#])([a-zA-Z0-9_-]+)/g);
          if (matches) {
            matches.forEach(token => {
              const name = token.slice(1);
              if (
                name.length > 1 &&
                !name.startsWith('cls_') &&
                !name.startsWith(namespace)
              ) {
                classSet.add(name);
              }
            });
          }
        });
      });
    }
  ]).process(css, { from: filePath });
}

// 🔍 Extract className="..." or id="..." strings in HTML/JS
function extractClassNamesFromCode(filePath, classSet) {
  const code = fs.readFileSync(filePath, 'utf8');
  const regex = /(?:id=|class(Name)?=|clsx\(|["'`])[\s{]*[`'"]([^"`']+)[`'"]/g;

  let match;
  while ((match = regex.exec(code)) !== null) {
    const raw = match[2];
    if (raw) {
      const classes = raw.split(/\s+/);
      classes.forEach(cls => {
        if (
          cls.length > 1 &&
          !cls.startsWith('cls_') &&
          !cls.startsWith(namespace)
        ) {
          classSet.add(cls);
        }
      });
    }
  }
}

// 🏁 MAIN
async function run(inputDir) {
  const stat = fs.statSync(inputDir);
  const isFile = stat.isFile();
  const mapPath = `mapping/${namespace}.map.json`;

  // --- REVERSE MODE ---
  if (isReverse) {
    if (!fs.existsSync(mapPath)) {
      console.error(`❌ Mapping file not found: ${mapPath}`);
      return;
    }

    const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const reverseMap = reverseMapping(mapping);

    if (isFile) {
      if (inputDir.endsWith('.html')) reverseHTML(inputDir, reverseMap);
      if (inputDir.endsWith('.css')) reverseCSS(inputDir, reverseMap);
    } else {
      const htmlFiles = getAllFiles(inputDir, ['.html']);
      const cssFiles = getAllFiles(inputDir, ['.css']);
      htmlFiles.forEach(f => reverseHTML(f, reverseMap));
      cssFiles.forEach(f => reverseCSS(f, reverseMap));
    }

    console.log(`🔁 Reverse obfuscation complete for namespace "${namespace}"`);
    return;
  }

  // --- FORWARD MODE ---
  const cssFiles = isFile ? [inputDir] : getAllFiles(inputDir, ['.css']);
  const htmlFiles = isFile ? [inputDir] : getAllFiles(inputDir, ['.html']);
  const codeFiles = isFile ? [] : getAllFiles(inputDir, ['.js', '.jsx', '.ts', '.tsx']);

  const allClassNames = new Set();
  for (let file of cssFiles) await extractClassNames(file, allClassNames);
  for (let file of htmlFiles) extractClassNamesFromCode(file, allClassNames);
  for (let file of codeFiles) extractClassNamesFromCode(file, allClassNames);

  const mapping = createMapping([...allClassNames], namespace);
  fs.mkdirSync('mapping', { recursive: true });
  fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2));

  for (let file of cssFiles) await obfuscateCSS(file, mapping);
  for (let file of htmlFiles) obfuscateHTML(file, mapping);

  console.log(`✔️ Obfuscation complete for namespace "${namespace}" in ${inputDir}`);
}

run(inputPath);
