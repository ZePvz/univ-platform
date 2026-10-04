import app from './app.js'
import { config } from './config.js'

const onListening = () => {
  console.log(`Server running on http://${config.host ?? 'localhost'}:${config.port} (${config.nodeEnv})`)
}

// Production binds to 127.0.0.1 only (see config.host); dev keeps Node's
// default so `localhost` keeps working on both IPv4 and IPv6.
if (config.host) {
  app.listen(config.port, config.host, onListening)
} else {
  app.listen(config.port, onListening)
}
