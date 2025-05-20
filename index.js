const { getAllFiles } = require('./src/fileScanner');
const { createMapping } = require('./src/mapGenerator');
const { obfuscateCSS, obfuscateHTML } = require('./src/obfuscator');
const fs = require('fs');

async function run(inputDir) {
  const cssFiles = getAllFiles(inputDir, ['.css']);
  const htmlFiles = getAllFiles(inputDir, ['.html']);

  const allClassNames = new Set();

  // Extract class names from CSS files
  cssFiles.forEach(file => {
    const css = fs.readFileSync(file, 'utf8');
    const matches = css.match(/\.(\w+)/g) || [];
    matches.forEach(m => allClassNames.add(m.slice(1)));
  });

  const mapping = createMapping([...allClassNames]);
  fs.writeFileSync('mapping/map.json', JSON.stringify(mapping, null, 2));

  // Obfuscate all files
  for (let file of cssFiles) {
    await obfuscateCSS(file, mapping);
  }

  for (let file of htmlFiles) {
    obfuscateHTML(file, mapping);
  }

  console.log('✔️ Obfuscation complete.');
}

run('path_to_your_project');
