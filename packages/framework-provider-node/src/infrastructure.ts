import {
  BoosterConfig,
  httpStatusCodeFor,
  ProviderInfrastructure,
  toClassTitle,
  UserApp,
} from '@boostercloud/framework-types'
import micro, { send } from 'micro'
import { IncomingMessage, ServerResponse } from 'http'

const cors = require('micro-cors')()

export const Infrastructure = (userApp: UserApp): ProviderInfrastructure => ({
  start: async (_config: BoosterConfig, port: number) => {
    const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      try {
        const response = await userApp.boosterServeGraphQL(req)
        await send(res, 200, response.result)
      } catch (e) {
        const statusCode = httpStatusCodeFor(e)
        await send(res, statusCode, {
          title: toClassTitle(e),
          reason: e.message,
        })
      }
    }

    micro(
      cors((req: IncomingMessage, res: ServerResponse) =>
        req.method === 'OPTIONS' ? send(res, 200, 'ok') : handleRequest(req, res)
      )
    ).listen(port)
  },
})
