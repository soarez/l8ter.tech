const async = require('async');
const assert = require('assert');

const cache = require('./cache');

const {
  labels: labelConf
} = global.conf;

module.exports = getLabels;

function getLabels(gmail, cb) {
  const { userId } = gmail._options.params;

  cache.get(cacheKey(userId), onCacheResult);
  function onCacheResult(err, result) {
    if (err)
      console.error(err);

    if (result)
      return withLabels(result);

    fetch();
  }

  function withLabels(labels) {
    cb(null, labels);
  }

  function fetch() {
    gmail.users.labels.list({
      fields: 'labels(id,name)',
    }, onLabels);
  }

  function onLabels(err, res) {
    if (err)
      return cb(err);

    const labels = res.labels
      .filter(l => l.name in labelConf)
      .reduce((o, l) => {
        o[l.name] = l.id;
        return o;
      }, {});

    const missing = Object.keys(labelConf)
      .sort()
      .filter(l => !(l in labels));

    if (!missing.length)
      return save(labels);

    async.reduce(missing, labels, createLabel.bind(this), onAllCreated);
    function onAllCreated(err) {
      if (err)
        return cb(err);

      save(labels);
    }

    function save(labels) {
      assert(Object.keys(labelConf).every(l => l in labels));

      cache.save(cacheKey(userId), labels, onSaved);

      function onSaved(err) {
        if (err)
          console.error(err);

        withLabels(labels);
      }
    }
  }

  function createLabel(labels, name, cb) {
    console.log('Creating label: "%s"...', name);
    gmail.users.labels.create({
      resource: {
        labelListVisibility: 'labelHide',
        messageListVisibility: 'hide',
        name
      }
    }, onCreated);

    function onCreated(err, label) {
      if (err)
        return cb(err);

      assert.equal(label.name, name);
      labels[name] = label.id;

      cb(null, labels);
    }
  }
}

function cacheKey(userId) {
  assert.equal(typeof userId, 'string');
  return userId + '.labels';
}

