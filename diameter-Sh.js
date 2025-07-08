const diameter = require('diameter');
const dictionary = require('diameter-dictionary'); // Load prebuilt dictionary
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



const { OriginHost, OriginRealm, DestinationRealm, DestinationHost} = config.diameter_client;
const HOST = config.diameter_client.peer
const PORT = config.diameter_client.port

const options = {
  //  beforeAnyMessage: diameter.logMessage,
  //  afterAnyMessage: diameter.logMessage,
    port: PORT,
    host: HOST
};

// Create and maintain a persistent connection
const socket = diameter.createConnection(options, function () {
    console.log(`Connected to Diameter server ${HOST} Port ${PORT} (TCP)`);

    global.diameterConnection = socket.diameterConnection; // Store the connection globally
});

socket.on('diameterMessage', function (event) {
    console.log('Received server-initiated message:', event.message.command);
    event.callback(event.response);
});

socket.on('error', function (err) {
    console.error('Diameter connection error:', err);
    socket.end();
});

/**
 * Sends a User Data Request (UDR) and returns the response.
 * @param {string} publicIdentity - The Public-Identity to query.
 * @returns {Promise<object>} - Resolves with UDA response.
 */
function sendUDRRequest({ identityType = 'Public-Identity', identityValue, dataReference = 0 }) {
    return new Promise((resolve, reject) => {
        if (!global.diameterConnection) {
            return reject(new Error('Diameter connection is not established.'));
        }

        const connection = global.diameterConnection;
        const request = connection.createRequest('3GPP Sh', 'User-Data');

        request.body = request.body.concat([
            ['Session-Id', `${OriginHost};${Date.now()}`],
            ['Auth-Application-Id', 16777217],
            ['Origin-Host', OriginHost],
            ['Origin-Realm', OriginRealm],
            ['Destination-Realm', DestinationRealm],
            ['Destination-Host', DestinationHost],
            ['User-Identity', [[identityType, identityValue]]],
            ['Data-Reference', dataReference],
            ['Vendor-Specific-Application-Id', [
                ['Vendor-Id', 10415],
                ['Auth-Application-Id', 16777217]
            ]]
        ]);

        connection.sendRequest(request)
            .then(response => {
                const result = {};
                response.body.forEach(avp => {
                    if (avp[0] === 'Sh-User-Data') {
                        result['Sh-User-Data'] = avp[1].toString('utf-8');
                    } else {
                        result[avp[0]] = avp[1];
                    }
                });
                resolve(result);
            })
            .catch(reject);
    });
}




/**
 * Sends a (PUR) and returns the response.
 */


function sendPURRequest({ identityType = 'Public-Identity', identityValue, repositoryDataXML }) {
    return new Promise((resolve, reject) => {
        if (!global.diameterConnection) {
            return reject(new Error('Diameter connection is not established.'));
        }

        const connection = global.diameterConnection;
        const request = connection.createRequest('3GPP Sh', 'Profile-Update');

        request.body = request.body.concat([
            ['Session-Id', `${OriginHost};${Date.now()}`],
            ['Auth-Application-Id', 16777217],
            ['Origin-Host', OriginHost],
            ['Origin-Realm', OriginRealm],
            ['Destination-Realm', DestinationRealm],
            ['Destination-Host', DestinationHost],
            ['User-Identity', [[identityType, identityValue]]],
            ['Data-Reference', 0], // 0 = RepositoryData
            ['Vendor-Specific-Application-Id', [
                ['Vendor-Id', 10415],
                ['Auth-Application-Id', 16777217]
            ]],
            ['Sh-Data', repositoryDataXML] // XML string or Buffer
        ]);

        connection.sendRequest(request)
            .then(response => {
                const result = {};
                response.body.forEach(avp => {
                    result[avp[0]] = avp[1];
                });
                resolve(result);
            })
            .catch(reject);
    });
}




/* */
function sendSNRRequest({ identityType = 'Public-Identity', identityValue, dataReference = 1, subsReqType = 0 }) {
    // dataReference = 1 → IMSUserState (for example)
    // subsReqType = 0 → Subscribe (1 = Unsubscribe)

    return new Promise((resolve, reject) => {
        if (!global.diameterConnection) {
            return reject(new Error('Diameter connection is not established.'));
        }

        const connection = global.diameterConnection;
        const request = connection.createRequest('3GPP Sh', 'Subscribe-Notifications');

        request.body = request.body.concat([
            ['Session-Id', `${OriginHost};${Date.now()}`],
            ['Auth-Application-Id', 16777217],
            ['Origin-Host', OriginHost],
            ['Origin-Realm', OriginRealm],
            ['Destination-Host', DestinationHost],
            ['Destination-Realm', DestinationRealm],
            ['User-Identity', [[identityType, identityValue]]],
            ['Data-Reference', dataReference],
            ['Subs-Req-Type', subsReqType],
            ['Vendor-Specific-Application-Id', [
                ['Vendor-Id', 10415],
                ['Auth-Application-Id', 16777217]
            ]]
        ]);

        connection.sendRequest(request)
            .then(response => {
                const result = {};
                response.body.forEach(avp => {
                    result[avp[0]] = avp[1];
                });
                resolve(result);
            })
            .catch(reject);
    });
}


function sendDeviceWatchdogRequest() {
    if (!global.diameterConnection) {
        console.warn('DWR skipped: No Diameter connection established.');
        return;
    }

    try {
        const connection = global.diameterConnection;
        const request = connection.createRequest(0, 'Device-Watchdog');

        request.body = [
            ['Origin-Host', OriginHost],
            ['Origin-Realm', OriginRealm]
        ];

        connection.sendRequest(request)
          //  .then(() => console.log('DWR sent. DWA received.'))
         //   .catch(err => console.error('Failed to send DWR:', err));
    } catch (err) {
        console.error('Error while sending DWR:', err);
    }
}





setInterval(() => {
    sendDeviceWatchdogRequest();
}, 30000); // every 30 seconds



module.exports = {
    sendUDRRequest,
    sendPURRequest,
    sendSNRRequest,
};







/*
// UDR Example Usage
setTimeout(() => {
    sendUDRRequest({
        identityType: 'Public-Identity', // or 'Public-Identity' if you’re using a SIP URI
        identityValue: '3342012860', // the MSISDN or SIP URI
        dataReference: 1 // 0 = RepositoryData (or change to e.g., 6 = MSISDN, 1 = IMSUserState, etc.)
    })
    .then(response => {
        console.log('Final UDA Response:', response);
        socket.end();
    })
    .catch(error => {
        console.error('UDR Request Failed:', error);
        socket.end();
    });
}, 1000); // Delay to ensure Diameter connection is established
*/



/*
// PUR Example Usage
//
const exampleXML = `
<Sh-Data xmlns="urn:ietf:params:xml:ns:sh-data">
    <RepositoryData>
        <ServiceIndication>myApp</ServiceIndication>
        <Data>Hello world!</Data>
    </RepositoryData>
</Sh-Data>
`;

sendPURRequest({
    identityType: 'Public-Identity',
    identityValue: 'sip:alice@ims.mnc001.mcc001.3gppnetwork.org',
    repositoryDataXML: exampleXML
})
.then(res => {
    console.log('PUA Response:', res);
})
.catch(err => {
    console.error('PUR Request Failed:', err);
});

*/



/*

setTimeout(() => {
sendSNRRequest({
    identityType: 'Public-Identity',
    identityValue: '3342012860',
    dataReference: 1, // IMSUserState
    subsReqType: 0 // Subscribe
}).then(res => {
    console.log('SNA Response:', res);
}).catch(err => {
    console.error('SNR Request Failed:', err);
});
}, 1000); // Delay to ensure Diameter connection is established
*/
