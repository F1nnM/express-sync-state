const cuid = require('cuid');
const jsonpatch = require('fast-json-patch')

var Mutex = require('async-mutex').Mutex

function SyncedServer(data, refreshInterval = 500) {

  // List of clients to broadcast to
  // Mutex to avoid editing the list, while it's being read.
  var clients = {}
  const clientsMutex = new Mutex()

  function registerClient(client) {
    clientsMutex.runExclusive(() => {
      let id = cuid()
      clients[id] = client
      client.locals["syncid"] = id
    });
  }

  function unregisterClient(client) {
    clientsMutex.runExclusive(() => {
      delete clients[client.locals["syncid"]]
    })
  }

  // data is cloned here to have an immutable object, that can be broadcast, before a new set of patches is generated
  // mutex to avoid missing updates, if something changes between sending the client the object and registering for updates

  var oldData = jsonpatch.deepClone(data)
  var newData = null
  const dataMutex = new Mutex()

  setInterval(() => {
    dataMutex.runExclusive(() => {
      newData = jsonpatch.deepClone(data)
      operations = jsonpatch.compare(oldData, newData)
      let toWrite = `data: ${JSON.stringify(operations)}\n\n`
        clientsMutex.runExclusive(() => {
          for (const id in clients)
            if (!clients[id].writableEnded)
              clients[id].write(toWrite)
        })
      oldData = newData
    })
  }, refreshInterval)

  return function (req, res) {
    res.header('Cache-Control', 'no-cache')
    res.set('Content-Type', 'text/event-stream')

    dataMutex.runExclusive(() => {
      res.write(`data: ${JSON.stringify(oldData)}\n\n`)
      registerClient(res)
    })

    res.socket.on('end', function () {
      unregisterClient(res)
    })

  }
}

function SyncedClient(url, onUpdate) {
  const source = new EventSource(url)

  var data = null

  source.addEventListener('message', (e) => {
    if (data == null)
      data = JSON.parse(e.data)
    else
      data = jsonpatch.applyPatch(data, JSON.parse(e.data)).newDocument

    onUpdate(data)
  })
}

module.exports = { SyncedServer, SyncedClient }