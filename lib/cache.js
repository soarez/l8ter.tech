const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mkdirp = require('mkdirp');

const {
  cache: dir
} = global.conf;

if (!fs.existsSync(dir))
  mkdirp.sync(dir);

module.exports = {
  save,
  get,
};

function encode(key) {
  return crypto.createHash('md5').update(key).digest('hex');
}

function filePath(key) {
  return path.join(dir, encode(key));
}

function save(key, tokens, cb) {
  const content = JSON.stringify(tokens);
  fs.writeFile(filePath(key), content, onFileWrite);

  function onFileWrite(err) {
    if (err && !cb)
      console.error(err);

    cb(err);
  }
}

function get(key, cb) {
  const fp = filePath(key);
  fs.exists(fp, onExists);

  function onExists(exists) {
    if (!exists)
      return cb();

    fs.readFile(filePath(key), onFileRead);
  }

  function onFileRead(err, content) {
    if (err) {
      if (cb) cb(err);
      else console.error(err);
      return;
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      err = new Error('Cache is corrupt. ' + e);
      if (cb) cb(err);
      else console.error(err);
      return;
    }

    cb(null, result);
  }
}

