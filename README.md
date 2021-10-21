# express-sync-state
Sync any JSON-encodeable object from your server to all clients

## Installation
```
$ npm install express-sync-state
```

```JavaScript
const SyncedServer = require('express-sync-state');
```

## API
### `SyncedServer(object, [refreshInterval])`
 * `object` : A JSON-encodeable object to sync with any client
 * `refreshInterval` : Optional. Minimum time between updates sent to clients in ms. Defaults to 500.

# Usage
## Server
A simple server serving the state under the /state endpoint.
```JavaScript
var express = require('express');

var app = express();

const SyncedServer = require('express-sync-state');

const state = {rand: ["","",""]}

app.get("/state", SyncedServer(state))

setInterval(() => {
    state["rand"][Math.floor(Math.random()*3)] += "a"
}, 3000);

app.listen(8080, "0.0.0.0", () => {
  console.log("Listening under 0.0.0.0:8080");
})
```
## Client
A simple website just displaying the state variable.
```HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <!--
        Download the client.js from this repository:
        https://github.com/F1nnM/express-sync-state/blob/main/client.js
    -->
    <script src="client.js"></script>
</head>
<body>
    <pre id="pre"></pre>
    <script>
        SyncedClient("/state", (object) => {
            document.querySelector("#pre").innerHTML = JSON.stringify(object)
        })
    </script>
</body>
</html>
```
