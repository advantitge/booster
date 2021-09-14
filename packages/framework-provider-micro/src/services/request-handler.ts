import { httpStatusCodeFor, toClassTitle, UserApp } from '@boostercloud/framework-types'
import { IncomingMessage, ServerResponse } from 'http'
import { RequestHandler, send } from 'micro'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('micro-cors')()

export const createRequestHandler = (userApp: UserApp): RequestHandler => {
  return cors(async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method === 'OPTIONS') {
      await send(res, 200, 'OK')
      return
    }
    if (req.url === '/' && req.method === 'GET') {
      await send(res, 200, '')
      return
    }
    try {
      const response = await userApp.boosterServeGraphQL(req)
      await send(res, 200, response.result)
    } catch (e) {
      const statusCode = httpStatusCodeFor(e)
      if (statusCode === 500) console.error(e)
      await send(res, statusCode, {
        title: toClassTitle(e),
        reason: e.message,
      })
    }
  })
}
