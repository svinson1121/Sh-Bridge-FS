const Ari = require('ari-client');
const fs = require('fs');
const yaml = require('js-yaml');

let config;
try {
  const configFile = fs.readFileSync('./config.yaml', 'utf8');
  config = yaml.load(configFile);
} catch (e) {
  console.error('Error loading config file:', e.message);
  process.exit(1);
}

const ariUser = config.asterisk_ari.username;
const ariPass = config.asterisk_ari.password;
const appName = config.asterisk_ari.appname;
const ariPeer = config.asterisk_ari.peer;
const ariPort = config.asterisk_ari.port;

// Export a promise to connect and initialize ARI
const ws = {};

ws.connect = () => {
  return new Promise((resolve, reject) => {
    Ari.connect(`http://${ariPeer}:${ariPort}`, ariUser, ariPass, (err, client) => {
      if (err) {
        console.error('ARI connection failed:', err.message);
        return reject(err);
      }

      console.log(`Connected to ARI Server ${ariPeer} Port ${ariPort} (WebSocket)`);

      // Start the ARI application
      client.start(appName);

      // Listen for the 'pong' response from the WebSocket using ari.on (optional)
      client.on('pong', () => {
        console.log('Received pong from Asterisk');
      });

      // Store the client instance in ws.ari
      ws.ari = client;

      // Wait until the WebSocket connection is ready
      const checkWebSocket = setInterval(() => {
        if (client.ws && client.ws.readyState === client.ws.OPEN) {
          console.log('WebSocket connection established');
          clearInterval(checkWebSocket);  // Stop checking once the WebSocket is open
        }
      }, 1000); // Check every 1 second until WebSocket is ready

      resolve(ws);
    });
  });
};

module.exports = ws;

