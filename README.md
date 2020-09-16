# isatdatapro-microservices

This library provides a microservices framework for interacting with Inmarsat's 
IsatData Pro satellite IoT messaging service.  Messages sent from or to remote 
devices via satellite connectivity are stored in a database along with metadata 
about the satellite modem configuration and properties.  A Node.js singleton 
emitter is also supported to publish events such as message delivery, new modems 
sending data, and API/server errors.

[Documentation](https://inmarsat.github.io/isatdatapro-microservices/)

## Infrastructure

### Database

#### Models

The database supports the following model concepts:

* [**SatelliteGateway**](./docs/SatelliteGateway.html) represents the API server 
operated by Inmarsat or another authorized network operator.
``category = 'satellite_gateway'`` with ``name`` as the model-unique key.

* [**Mailbox**](./docs/Mailbox.html) represents an account providing authentication 
and segregation of customer data access.  These are configured with 
authentication credentials, where the password component is [encrypted] for 
storage.  ``category = 'mailbox'`` with ``mailboxId`` as the model-unique key.

* [**Mobile**](./docs/Mobile.html) represents a satellite modem associated with a 
remote asset/device and supports various metadata related to configuration, 
queried location and diagnostic information.  ``category = 'mobile'`` 
with ``mobileId`` as the model-unique key.

* [**MessageReturn**](./docs/MessageReturn.html) represents mobile-originated 
(aka *Return*) data, typically device telemetry or responses to low-level modem 
commands.  These messages contain data as raw binary and/or JSON structures 
depending on whether a *Message Definition File* is provisioned on the *Mailbox*.  
``category = 'message_return'`` with ``messageId`` as the model-unique key.

* [**MessageForward**](./docs/MessageForward.html) represents mobile-terminated 
(aka *Forward*) data, typically commands or small files sent to the device from 
a cloud-based application.  These messages contain data as raw binary and/or 
JSON structures depending on how they are submitted and whether a 
*Message Definition File* is provisioned on the *Mailbox*.  
``category = 'message_forward'``  with ``messageId`` as the model-unique key.

* [**ApiCallLog**](./docs/ApiCallLog.html) record the low-level API transactions 
to the Inmarsat server including various metadata used as a "high water mark" 
for message retrieval and for diagnostic purposes.  
``category = 'api_call_log'`` with ``callTimeUtc`` as the model-unique key.

#### Storage

Data storage architecture is dependent on the database type.  For example 
Azure Cosmos DB is a flat structure using a category tag for search, while 
MySQL initializes a table for each model type.  Model property keys use 
snake_case when stored in the database, which are translated to camelCase when 
retrieved via ``find()``

ApiCallLog and Messages include a *time-to-live* (**ttl**) class property 
with units in seconds.  When using Cosmos DB, this property should automatically 
remove aged data to keep database size smaller.  For MySQL, the user can 
implement a periodic check with the *removeAged* method.

#### Methods

The principle methods for accessing the database are:

1. **``initialize()``** ensures the database infrastructure is in place, creating 
it if running for the first time, and instantiates the connection.

2. **``find()``** retrieves the specified model based on its category and optional 
filter criteria.

3. **``upsert()``** adds a new model or updates an existing one based on its model-
unique key.

4. **``close()``** terminates the connection after use.

#### Configuration

The database particulars are configured as environment variables:

* **``DB_TYPE``** supports ``azureCosmos`` or ``mysql``

For [Cosmos DB](./docs/module-repositories_azureCosmosRepository-DatabaseContext.html):

* **``COSMOS_DB_HOST``** is the Azure URL for the Cosmos DB
* **``COSMOS_DB_PASS``** is the password for the Cosmos DB
* **``COSMOS_DB_NAME``** is the database name e.g. IsatDataPro
* **``COSMOS_DB_CONTAINER``** is the container name e.g. Main
* **``COSMOS_DB_PARTITION``** is the partition name i.e. ``category``
* **``COSMOS_DB_THROUGHPUT``** is the default throughput e.g. 400

For [MySQL](./docs/module-repositories_mysqlRepository-DatabaseContext.html):

* **``MYSQL_DB_HOST``** is the MySQL host name e.g. localhost
* **``MYSQL_DB_USER``** is the access name e.g. root
* **``MYSQL_DB_PASS``** is the password
* **``MYSQL_DB_NAME``** is the name of the database e.g. IsatDataPro

### Encryption

The encryption function is primarily for illustrative purposes using AES-256 
based on a secret/key stored as an environment variable ``MAILBOX_SECRET``.  The 
encryption is used at rest when storing Mailbox password in the database, then 
decrypted to pass as a credential in the relevant API call, which in turn is 
encrypted by TLS in transit.

### Event Handler

The [``eventHandler.emitter``](./docs/module-eventHandler.html) is implemented as a 
Node *events* emitter intended for use as a singleton, which emits the 
following dependent on the microservice in play:

* **NewMobile** includes metadata about a new satellite modem the first time a 
return message is received causing that Mobile to be added to the database.

* **NewReturnMessage** includes message content and metadata whenever a new 
return messsage is received from any modem.

* **NewForwardMessage** includes content and metadata when a forward message is 
submitted via the ``submitForwardMessages`` microservice.

* **ForwardMessageStateChange** triggers when a submitted forward message's 
state changes e.g. to DELIVERED or FAILED.

* **OtherClientForwardSubmission** triggers when a status is retrieved for a 
forward message that was *not* submitted via the ``submitForwardMessages`` 
microservice.

* **ApiError** triggers when an error code is returned by the Inmarsat API.

* **ApiOutage** triggers when the Inmarsat API becomes non-responsive.  API 
state is maintained in the database ``SatelliteGateway`` property ``alive``.

* **ApiRecovery** triggers when the Inmarsat API becomes responsive after an 
outage.

### Logging

A Winston [logger](./docs/module-logging.html) is included to provide 
JSON-structured logs with a standard format and UTC timestamp for 
troubleshooting.  A proxy logger is exposed for convenience use by applications 
using the library.

### Message Codecs

All IsatData Pro modems support a standard set of basic remote operations 
referred to as [*Core Modem Messages*](./docs/module-messageCodecs_coreModem.html) 
which are normally presented as JSON-structured data on the API and contain 
metadata about the modem.

The ``getReturnMessages`` microservice parses these standard messages to 
populate *Mobile* metadata in the database.

Additionally the ``submitForwardMessages`` microservice accepts shorthand 
remote commands/parameters which use the message codec to encode the message to 
send over the air.

The JSON-structured data employs a so-called *common message format* supporting 
various data types encoded as binary data over the satellite link.  To make use 
of [``commonMessageFormat``](./docs/module-messageCodecs_commonMessageFormat.html) 
for application messages, contact your Inmarsat representative to discuss the 
concept of *Message Definition File* in your application.

## Microservices

The microservices and eventHandler emitter are the primary aspects exposed by 
this library.  Before using the microservices it is necessary to "provision" at 
least one *SatelliteGateway* (API URL) and one *Mailbox* with valid access 
credentials.

* [**``getReturnMessages``**](./docs/module-getReturnMessages.html) is intended to 
run periodically (e.g. every 15 seconds) to retrieve new messages coming in from 
all modems accessed by the provisioned *Mailbox*(es).  
Events emitted include ``NewReturnMessage``, ``NewMobile``.

* [**``submitForwardMessages``**](./docs/module-submitForwardMessages.html) is called 
destined to a specific *mobileId* with specific commands, an array of 
decimal-coded bytes *payloadRaw* or an application-specific *payloadJson*.  
Events emitted include ``NewForwardMessage``.

* [**``getForwardStatuses``**](./docs/module-getForwardStatuses.html) is intended to 
be run periodically, in particular following the use of 
``submitForwardMessages`` to monitor the progression of commands or 
mobile-terminated data.  Events emitted include ``ForwardMessageStateChange``, 
``OtherClientForwardSubmission``.

* [**``getForwardMessages``**](./docs/module-getForwardMessages.html) is intended to 
be used following a ``OtherClientForwardSubmission`` event, to retrieve the 
content of a message submitted by a means other than ``submitForwardMessages`` 
(which generally implies another API client is accessing the Mailbox in 
parallel).

* [**``updateMailbox``**](./docs/module-updateMailbox.html) is used to add a 
*Mailbox* to the database which will subsequently be polled by 
``getReturnMessages`` and accessible for ``submitForwardMessages``.  
A *Mailbox* is the parent of one or more *Mobile*(s).

* [**``updateSatelliteGateway``**](./docs/module-updateSatelliteGateway.html) is used 
to add a *SatelliteGateway* to the database as the parent of one or more 
*Mailbox*(es).

* [**``getMobiles``**](./docs/module-getMobiles.html) may be used to retrieve the 
list of *Mobile*(s) metadata from the provisioned *Mailbox*(es).  This operation 
is useful if a given Mobile has not yet sent any return messages.

