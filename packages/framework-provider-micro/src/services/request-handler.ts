import { httpStatusCodeFor, toClassTitle } from '@boostercloud/framework-types'
import { IncomingMessage, ServerResponse } from 'http'
import { send } from 'micro'
import createCors from 'micro-cors'
import { APIResult } from '../library/api-adapter'
import { boosterServeGraphQL } from '@boostercloud/framework-core'

const cors = createCors()

function responseToHtml(text: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${text}</body></html>`
}

export const requestHandler: (req: IncomingMessage, res: ServerResponse) => Promise<void> = cors(
  async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    switch (req.method) {
      case 'OPTIONS':
        await send(res, 200, responseToHtml('🆗'))
        break
      case 'GET':
        req.url === '/' ? await send(res, 200, responseToHtml('🚀')) : await send(res, 404, 'Not found')
        break
      case 'POST':
        try {
          const response = (await boosterServeGraphQL(req)) as APIResult
          if (response.status !== 'success') throw Error(`Unexpected failure response: ${JSON.stringify(response)}`)
          await send(res, 200, response.result)
        } catch (e) {
          if (!(e instanceof Error)) throw e
          const statusCode = httpStatusCodeFor(e)
          if (statusCode === 500) console.error(e)
          await send(res, statusCode, { title: toClassTitle(e), reason: e.message })
        }
        break
      default:
        await send(res, 405, responseToHtml('🚫'))
    }
  }
)
