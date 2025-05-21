const postcss = require('postcss');
const cheerio = require('cheerio');
const fs = require('fs');

// Lookup helper
function lookupObfuscatedName(originalName, mapping) {
  const key = Object.keys(mapping).find(k => k.endsWith(`::${originalName}`));
  return key ? mapping[key] : originalName;
}

// ✅ Obfuscate both `.class-name` and `#id-name` in CSS
async function obfuscateCSS(filePath, mapping) {
  const css = fs.readFileSync(filePath, 'utf8');
  const result = await postcss([
    root => {
      root.walkRules(rule => {
        rule.selectors = rule.selectors.map(selector => {
          // Replace both classes and IDs with hyphen support
          return selector
            .replace(/\.([a-zA-Z0-9_-]+)/g, (_, className) => {
              const obf = lookupObfuscatedName(className, mapping);
              return `.${obf}`;
            })
            .replace(/#([a-zA-Z0-9_-]+)/g, (_, idName) => {
              const obf = lookupObfuscatedName(idName, mapping);
              return `#${obf}`;
            });
        });
      });
    }
  ]).process(css, { from: filePath });

  fs.writeFileSync(filePath, result.css);
}

// ✅ Obfuscate IDs and class names in HTML
function obfuscateHTML(filePath, mapping) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);

  $('[class]').each((_, el) => {
    const classes = $(el).attr('class').split(/\s+/);
    const updated = classes.map(cls => lookupObfuscatedName(cls, mapping));
    $(el).attr('class', updated.join(' '));
  });

  $('[id]').each((_, el) => {
    const id = $(el).attr('id');
    const updatedId = lookupObfuscatedName(id, mapping);
    if (updatedId !== id) {
      $(el).attr('id', updatedId);
    }
  });

  fs.writeFileSync(filePath, $.html());
}

module.exports = {
  obfuscateCSS,
  obfuscateHTML
};
