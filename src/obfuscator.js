const postcss = require('postcss');
const cheerio = require('cheerio');
const fs = require('fs');

// 🔧 Obfuscate class names in CSS files
async function obfuscateCSS(filePath, mapping) {
  const css = fs.readFileSync(filePath, 'utf8');
  const result = await postcss([
    root => {
      root.walkRules(rule => {
        rule.selectors = rule.selectors.map(selector => {
          return selector.replace(/\.(\w+)/g, (_, className) => {
            return mapping[className] ? `.${mapping[className]}` : `.${className}`;
          });
        });
      });
    }
  ]).process(css, { from: filePath });

  fs.writeFileSync(filePath, result.css);
}

// 🔧 Obfuscate class and ID names in HTML files
function obfuscateHTML(filePath, mapping) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);

  $('[class]').each((_, el) => {
    const classes = $(el).attr('class').split(/\s+/);
    const updated = classes.map(cls => mapping[cls] || cls);
    $(el).attr('class', updated.join(' '));
  });

  $('[id]').each((_, el) => {
    const id = $(el).attr('id');
    if (mapping[id]) {
      $(el).attr('id', mapping[id]);
    }
  });

  fs.writeFileSync(filePath, $.html());
}

module.exports = {
  obfuscateCSS,
  obfuscateHTML
};
