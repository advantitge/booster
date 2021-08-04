import { BoosterConfig, httpStatusCodeFor, ProviderInfrastructure, toClassTitle, UserApp } from '@boostercloud/framework-types'
import { IncomingMessage, ServerResponse } from 'http'
import micro, { RequestHandler, send } from 'micro'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('micro-cors')()

export const createRequestHandler = (userApp: UserApp): RequestHandler => {
    return cors(
        async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
            if (req.method === 'OPTIONS') {
                send(res, 200, 'OK')
                return
            }
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
        },
    )
}

export const Infrastructure = (requestHandler: RequestHandler): ProviderInfrastructure => ({
    start: async (_config: BoosterConfig, port: number) => {
        micro(requestHandler).listen(port)
    },
})
