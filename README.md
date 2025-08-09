###  Node.js FreeSwitch  ESL  to diameter sh interface bridge


## I have not tested this code yet with FS..


install node.js  v24.3.0

npm install

edit config.yaml

node sh-bridge.js





------------------------------
sendevent CUSTOM
Event-Subclass: sendUDRRequest
Unique-ID: 0d2b159c-5431-11ee-b8e9-0242ac120002
MSISDN: 3342012832





Connected to Diameter server 10.90.250.32 Port 3868 (TCP)
Connected to FreeSWITCH ESL at 127.0.0.1:8021
Listening for ESL events from FreeSWITCH
New Query 0d2b159c-5431-11ee-b8e9-0242ac120002 MSISDN: 3342012832, Function: sendUDRRequest
Forwarding UDR to HSS...
Setting FS var: SERVING_MME = mme.epc.mnc435.mcc311.3gppnetwork.org
Setting FS var: MSISDN = 3342012832
Setting FS var: SCSCF = None
Setting FS var: CF_ACTIVE = True
Setting FS var: CF_UNCONDITIONAL = False
Setting FS var: CF_NOREG = False
Setting FS var: CF_BUSY = False
Setting FS var: CF_NOANSWER = False
Setting FS var: CF_NOTREACHABLE = False
Setting FS var: CF_NOREPLYTIMER = 20
Setting FS var: INBOUND_BARRED = False
Setting FS var: OUTBOUND_BARRED = False
Setting FS var: IMS_PUBLICIDENT = sip:3342012832@ims.mnc435.mcc311.3gppnetwork.org
Setting FS var: IMS_PRIVATEIDENT = 311435000070570@ims.mnc435.mcc311.3gppnetwork.org
Sh data injected into channel vars

