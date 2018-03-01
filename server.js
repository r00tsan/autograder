// Server
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);

// Helpers
const config = require('./server/config');
const wsApi = require('./server/ws-api/index');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  next();
});

expressWs.getWss().on('connection', ws => {
  console.log('connection open');
  ws.send(JSON.stringify({type: 'Connected to Node server'}));
});

app.ws('/', wsApi);

app.use('/', express.static('dist'));

app.listen(config.applicationPort, () =>
  console.log(`Server started on port ${config.applicationPort}`)
);
