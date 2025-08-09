const esl = require('modesl');
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

const fsUser = config.freeswitch_esl.username;
const fsPass = config.freeswitch_esl.password;
const fsHost = config.freeswitch_esl.host || '127.0.0.1';
const fsPort = config.freeswitch_esl.port || 8021;

const fses = {};

fses.connect = () => {
  return new Promise((resolve, reject) => {
    const conn = new esl.Connection(fsHost, fsPort, fsPass, () => {
      console.log(`Connected to FreeSWITCH ESL at ${fsHost}:${fsPort}`);

      // Example: subscribe to all events in plain text
      conn.events('plain', 'ALL');

        //conn.on('esl::event::CUSTOM::*', (evt) => {
	//const uuid = evt.getHeader('Unique-ID');
        //const caller = evt.getHeader('MSISDN');
	//const eventclass = evt.getHeader('Event-Subclass');
	//console.log('Custom event received:', evt.getHeader('Event-Name'), evt.getBody());
	//console.log(`Event SubClass: ${eventclass}`);
        //console.log(`Call created: ${uuid} from ${caller}`);

  //    });

   //   conn.on('esl::event::CHANNEL_CREATE::*', (evt) => {
   //     const uuid = evt.getHeader('Unique-ID');
   //     const caller = evt.getHeader('Caller-Caller-ID-Number');
   //     console.log(`Call created: ${uuid} from ${caller}`);
   //   });

      conn.on('error', (err) => {
        console.error('ESL Error:', err);
      });

      // Save connection
      fses.esl = conn;
      resolve(fses);
    });

    conn.on('error', (err) => {
      console.error('Failed to connect to ESL:', err.message);
      reject(err);
    });
  });
};

module.exports = fses;

