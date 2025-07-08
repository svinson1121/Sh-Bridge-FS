require('./ws.js');
const url = require('url');
const xml2js = require('xml2js');
const { sendUDRRequest } = require('./diameter-Sh.js');
const { sendPURRequest } = require('./diameter-Sh.js');
const { sendSNRRequest } = require('./diameter-Sh.js');
const ws = require('./ws.js');






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

ws.connect().then((wsInstance) => {
    console.log('Listening for ARI events');

    // Initialize ari-client with wsInstance
    const ari = wsInstance.ari;

    // Listen for StasisStart event
    ari.on('StasisStart', async (event, channel) => {
        const [functionName, msisdn] = event.args;
        console.log(`StasisStart received for function: ${functionName}, MSISDN: ${msisdn}`);

        switch (functionName) {
		case 'sendUDRRequest':
    try {
        console.log('Forwarding UDR to HSS');
        const result = await sendUDRRequest({ identityValue: `${msisdn}` });
        console.log('Received Sh UDR Response');

        const xml = result['Sh-User-Data'];

        // Parse and handle response
        parseShResponse(xml, async (err, parsed) => {
            if (err) {
                console.error('Error parsing XML:', err);
                return;
            }

            try {
                const shData = parsed['Sh-Data'] || {};
                const imsData = shData['Sh-IMS-Data'] || {};
                const extenData = shData['Extension'] || {};
                const epsLocationInformation = extenData['EPSLocationInformation'] || {};
                const pubIds = shData['PublicIdentifiers'] || {};
                const msisdnParsed = pubIds['MSISDN'] || '';
                const scscf = imsData['S-CSCFName'] || '';
                const callForwardActive = imsData['CallForwardActive'] || '';
                const callForwardUnconditional = imsData['CallForwardUnconditional'] || '';
                const callForwardNotRegistered = imsData['CallForwardNotRegistered'] || '';
                const callForwardNoAnswer = imsData['CallForwardNoAnswer'] || '';
                const callForwardBusy = imsData['CallForwardBusy'] || '';
                const callForwardNotReachable = imsData['CallForwardNotReachable'] || '';
                const callForwardNoReplyTimer = imsData['CallForwardNoReplyTimer'] || '';
                const inboundBarred = imsData['InboundCommunicationBarred'] || '';
                const outboundBarred = imsData['OutboundCommunicationBarred'] || '';
                const publicIdent = pubIds['IMSPublicIdentity'] || '';
                const privateIdent = shData['IMSPrivateUserIdentity'] || '';
                const servingMME = epsLocationInformation['MMEName'] || '';

                const vars = {
                    SERVING_MME: servingMME,
                    MSISDN: msisdnParsed,
                    SCSCF: scscf,
                    CF_ACTIVE: callForwardActive,
                    CF_UNCONDITIONAL: callForwardUnconditional,
                    CF_NOREG: callForwardNotRegistered,
                    CF_BUSY: callForwardBusy,
                    CF_NOANSWER: callForwardNoAnswer,
                    CF_NOTREACHABLE: callForwardNotReachable,
                    CF_NOREPLYTIMER: callForwardNoReplyTimer,
                    INBOUND_BARRED: inboundBarred,
                    OUTBOUND_BARRED: outboundBarred,
                    IMS_PUBLICIDENT: publicIdent,
                    IMS_PRIVATEIDENT: privateIdent
                };

                // Set ARI vars one-by-one (you can also do these in parallel with Promise.all if needed)
                for (const [key, value] of Object.entries(vars)) {
                    await ari.channels.setChannelVar({ channelId: channel.id, variable: key, value });
                }

                console.log('Sh values sent to ARI');

                // Now continue in dialplan
                channel.continueInDialplan((err) => {
                    if (err) {
                        console.error('Failed to continue in dialplan', err);
                    } else {
                        console.log('Channel returned to dialplan.');
                    }
                });

            } catch (error) {
                console.error('Error setting channel variables or continuing dialplan:', error);
            }
        });

    } catch (err) {
        console.error('Error sending UDR request:', err);
    }

    break;

            case 'sendPUR':
                sendPURRequest(msisdn);
                break;

            default:
                console.log('Unknown function:', functionName);
        }
    });

    // Other event listeners (e.g., ChannelDestroyed)
    ari.on('ChannelDestroyed', (event, channel) => {
        console.log('Channel ended:', channel.id);
    });

}).catch((err) => {
    console.error('Failed to connect to ARI:', err);
});

