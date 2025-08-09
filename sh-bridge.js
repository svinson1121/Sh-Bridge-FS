const xml2js = require('xml2js');
const { sendUDRRequest } = require('./diameter-Sh.js');
const { sendPURRequest } = require('./diameter-Sh.js');
const fses = require('./freeswitch-esl-client.js');

function parseShResponse(xml, callback) {
  xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
    if (err) {
      console.error('Failed to parse XML:', err);
      callback(err);
    } else {
      callback(null, result);
    }
  });
}

fses.connect().then((fsesInstance) => {
  const conn = fsesInstance.esl;
  console.log('Listening for ESL events from FreeSWITCH');

  conn.on('esl::event::CUSTOM::*', async (evt) => {
    const uuid = evt.getHeader('Unique-ID');
    const msisdn = evt.getHeader('MSISDN');
    const shFunction = evt.getHeader('Event-Subclass'); 

    if (!shFunction) return;

    console.log(`New Query ${uuid} MSISDN: ${msisdn}, Function: ${shFunction}`);

    switch (shFunction) {
      case 'sendUDRRequest':
        try {
          console.log('Forwarding UDR to HSS...');
          const result = await sendUDRRequest({ identityValue: `${msisdn}` });
          const xml = result['Sh-User-Data'];

          parseShResponse(xml, async (err, parsed) => {
            if (err) return;

            const shData = parsed['Sh-Data'] || {};
            const imsData = shData['Sh-IMS-Data'] || {};
            const extenData = shData['Extension'] || {};
            const epsLocationInformation = extenData['EPSLocationInformation'] || {};
            const pubIds = shData['PublicIdentifiers'] || {};

            const vars = {
              SERVING_MME: epsLocationInformation['MMEName'] || '',
              MSISDN: pubIds['MSISDN'] || '',
              SCSCF: imsData['S-CSCFName'] || '',
              CF_ACTIVE: imsData['CallForwardActive'] || '',
              CF_UNCONDITIONAL: imsData['CallForwardUnconditional'] || '',
              CF_NOREG: imsData['CallForwardNotRegistered'] || '',
              CF_BUSY: imsData['CallForwardBusy'] || '',
              CF_NOANSWER: imsData['CallForwardNoAnswer'] || '',
              CF_NOTREACHABLE: imsData['CallForwardNotReachable'] || '',
              CF_NOREPLYTIMER: imsData['CallForwardNoReplyTimer'] || '',
              INBOUND_BARRED: imsData['InboundCommunicationBarred'] || '',
              OUTBOUND_BARRED: imsData['OutboundCommunicationBarred'] || '',
              IMS_PUBLICIDENT: pubIds['IMSPublicIdentity'] || '',
              IMS_PRIVATEIDENT: shData['IMSPrivateUserIdentity'] || ''
            };

            for (const [key, value] of Object.entries(vars)) {
	      console.log(`Setting FS var: ${key} = ${value}`);
              conn.api('uuid_setvar', `${uuid} ${key} '${value}'`, (res) => {  // is this the correct way to inject the data?
                if (res.getBody().trim() !== '+OK') {
                  console.warn(`Failed to set var ${key}`);
                }
              });
            }

            console.log('Sh data injected into channel vars');
          });
        } catch (err) {
          console.error('UDR failed:', err);
        }
        break;

      case 'sendPURRequest':
        sendPURRequest(msisdn);
        break;

      default:
        console.warn('Unknown ShFunction:', shFunction);
    }
  });
});

