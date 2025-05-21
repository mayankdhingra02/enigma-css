// const crypto = require('crypto');

// function generateClassName(original, prefix = 'cls') {
//   const hash = crypto.createHash('md5').update(original + Date.now()).digest('hex');
//   return `${prefix}_${hash.slice(0, 6)}`;
// }

// function createMapping(classList, namespace = 'default', prefix = 'cls') {
//     const map = {};
//     classList.forEach(cls => {
//       const key = `${namespace}::${cls}`;
//       if (!map[key]) {
//         const hash = crypto.createHash('md5').update(cls + namespace + Date.now()).digest('hex');
//         map[key] = `${prefix}_${namespace}_${hash.slice(0, 6)}`;
//       }
//     });
//     return map;
//   }
  
  
// module.exports = { createMapping };
const crypto = require('crypto');

function createMapping(classList, namespace = 'default', prefix = 'cls') {
  const map = {};
  classList.forEach(cls => {
    const key = `${namespace}::${cls}`;
    if (!map[key]) {
      const hash = crypto.createHash('md5').update(namespace + '::' + cls).digest('hex');
      map[key] = `${prefix}_${namespace}_${hash.slice(0, 6)}`;
    }
  });
  return map;
}

module.exports = { createMapping };
