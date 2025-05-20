const crypto = require('crypto');

function generateClassName(original, prefix = 'cls') {
  const hash = crypto.createHash('md5').update(original + Date.now()).digest('hex');
  return `${prefix}_${hash.slice(0, 6)}`;
}

function createMapping(classList) {
  const map = {};
  classList.forEach(cls => {
    if (!map[cls]) {
      map[cls] = generateClassName(cls);
    }
  });
  return map;
}

module.exports = { createMapping };
