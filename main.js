global.conf = require('./conf');

const assert = require('assert');
const google = require('googleapis');
const async = require('async');

const getAuth = require('./lib/get-auth');
const ensureLabels = require('./lib/get-labels');

const {
  labels: labelConf
} = global.conf;

const context = {
  userId: 'igorsoarez@gmail.com',
};
async.waterfall([
  ensureAuth,
  async.asyncify(buildApiClient),
  ensureLabels,
  emptyLabels,
].map(fn => fn.bind(context)), assert.ifError);

function ensureAuth(cb) {
  getAuth(this.userId, cb);
}

function buildApiClient(auth) {
  return this.gmail = google.gmail({
    auth,
    version: 'v1',
    params: {
      userId: this.userId
    }
  });
}

function getLabels(gmail, cb) {
  ensureLabels(gmail, cb);
}

function emptyLabels(labelIdMap, cb) {
  const now = new Date();
  const labelIds = Object.keys(labelConf)
    .filter(l => labelConf[l](now))
    .map(l => labelIdMap[l]);

  async.eachSeries(labelIds, emptyLabel.bind(this), cb);
}

function emptyLabel(labelId, cb) {
  const ids = [];
  const self = this;
  let pageToken = null;
  nextPage();
  function nextPage() {
    self.gmail.users.threads.list({
      labelIds: [ labelId ],
      maxResults: 1,
      pageToken,
      includeSpamTrash: false,
      fields: 'nextPageToken,threads(id)'
    }, onList);

    function onList(err, result) {
      if (err)
        return cb(err);

      if (result.threads)
        ids.push(result.threads.map(t => t.id));

      pageToken = result.nextPageToken;
      if (pageToken)
        return setImmediate(nextPage);

      async.eachSeries(ids, unsnoozeThread, cb);
    }
  }

  function unsnoozeThread(threadId, cb) {
    self.gmail.users.threads.modify({
      id: threadId,
      fields: 'id',
      resource: {
        addLabelIds: [ 'INBOX' ],
        removeLabelIds: [ labelId ],
      }
    }, cb);
  }
}

