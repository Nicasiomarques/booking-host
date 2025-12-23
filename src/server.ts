import 'dotenv/config'
import { buildApp } from './adapters/inbound/http/http.adapter.js'
import { appConfig } from './config/app.config.js'

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: appConfig.port, host: appConfig.host })
    app.log.info(`Server listening on http://${appConfig.host}:${appConfig.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
