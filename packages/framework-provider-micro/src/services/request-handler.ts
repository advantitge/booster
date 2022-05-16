import { httpStatusCodeFor, toClassTitle } from '@boostercloud/framework-types'
import { IncomingMessage, ServerResponse } from 'http'
import { send } from 'micro'
import createCors from 'micro-cors'
import { APIResult } from '../library/api-adapter'
import { boosterServeGraphQL } from '@boostercloud/framework-core'
import { URL } from 'url'

const cors = createCors()

function responseToHtml(text: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;">${text}</body></html>`
}

function renderExplorer(endpoint: string): string {
  return responseToHtml(
    `<iframe style="width:100vw;height:100vh;border:0" src="https://studio.apollographql.com/sandbox/explorer?endpoint=${encodeURIComponent(
      endpoint
    )}"></iframe>`
  )
}

export const requestHandler: (req: IncomingMessage, res: ServerResponse) => Promise<void> = cors(
  async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const host = req.headers.host
    if (!host) throw Error(`Host header is missing ${JSON.stringify(req.headers)}`)
    const url = new URL(req.url || '/', host.includes('localhost') ? `http://${host}` : `https://${host}`)
    switch (req.method) {
      case 'OPTIONS':
        await send(res, 200, responseToHtml('🆗'))
        break
      case 'GET':
        if (url.pathname === '/') {
          await send(res, 200, responseToHtml('🚀'))
        } else if (url.pathname === '/explorer') {
          const endpoint = req.headers.host?.includes('localhost')
            ? `http://${req.headers.host}`
            : `https://${req.headers.host}`
          await send(res, 200, renderExplorer(endpoint))
        } else {
          await send(res, 404, responseToHtml('4️⃣0️⃣4️⃣ Not found'))
        }
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
