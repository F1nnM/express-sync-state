const jsonpatch = require('fast-json-patch')

var Mutex = require('async-mutex').Mutex

function server() {

  // List of clients to broadcast to
  // Mutex to avoid editing the list, while it's being read.
  var clients = [];
  const clientsMutex = new Mutex()

  function registerClient(client) {
    clientsMutex.runExclusive(() => {
      clients.push(client);
    });
  }

  function unregisterClient(client) {
    clientsMutex.runExclusive(() => {
      let index = clients.findIndex(client)
      clients.splice(index, 1)
    })
  }

  // data object created here, to make it harder to modify outside the mutex lock.
  // mutex to avoid missing updates, if something changes between sending the client the object and registering for updates

  const data = {}
  const dataMutex = new Mutex()

  jsonpatch.observe(data, (patches) => {
    for (const patch of patches) {
      let toWrite = `data: ${JSON.stringify(patch)}n\n`
      clientsMutex.runExclusive(() => {
        for (const client of clients)
          if (!res.writableEnded)
            client.res.write(toWrite)
      })
    }
  });

  const safeBroadcastUpdates = function (updatingLambda) {
    dataMutex.runExclusive(() => updatingLambda(data))
  }

  return {
    handler: function (req, res) {
      res.header('Cache-Control', 'no-cache')
      res.set('Content-Type', 'text/event-stream')

      dataMutex.runExclusive(() => {
        res.send(`data: ${JSON.stringify(data)}n\n`)
        registerClient(res)
      })

      res.socket.on('end', function () {
        unregisterClient(res)
      })

    },
    safeBroadcastUpdates
  }
}

function client(serverURL, onUpdate) {
  const source = new EventSource(serverURL)

  var data = null
  const dataMutex = new Mutex()

  source.addEventListener('message', (e) => {
    dataMutex.runExclusive(() => {
      if (data == null)
        data = JSON.parse(e.data)
      else
        data = jsonpatch.applyOperation(data, JSON.parse(e.data))

      onUpdate(data)
    })
  })


}

module.exports = {
  SyncedServer: server,
  SyncedClient: client
}