const secrets = require('./secrets');

module.exports = {
  cache: '/tmp/l8ter.tech',

  // OAuth
  clientId: secrets.clientId,
  clientSecret: secrets.clientSecret,

  redirectUrl: 'http://localhost:8080/oauth2cb',

  scopes: [
    'https://www.googleapis.com/auth/gmail.modify',
  ],

  labels: {
    'L8ter': d => true,
    'L8ter/Tomorrow': d => d.getHours() < 12,
    'L8ter/Next-week': d => d.getDay() === 1,
    'L8ter/Weekend': d =>
      d.getDay() === 5 && d.getHours() > 17 ||
      d.getDay() === 6 ||
      d.getDay === 0,
  }
};

