import { getLogger } from '@boostercloud/framework-common-helpers'
import { BoosterConfig, GraphQLRequestEnvelope, GraphQLRequestEnvelopeError, UUID } from '@boostercloud/framework-types'
import { IncomingMessage } from 'http'
import { json } from 'micro'
import { parse } from 'cookie'

export async function rawGraphQLRequestToEnvelope(
  config: BoosterConfig,
  request: IncomingMessage
): Promise<GraphQLRequestEnvelope | GraphQLRequestEnvelopeError> {
  const logger = getLogger(config, 'GraphQLAdapter#rawGraphQLRequestToEnvelope')
  const body = await json(request)

  logger.debug('Received GraphQL request: \n- Headers: ', request.headers, '\n- Body: ', body)
  const requestID = UUID.generate() // TODO: Retrieve request ID from request
  const eventType = 'MESSAGE' // TODO: (request.requestContext?.eventType as GraphQLRequestEnvelope['eventType']) ?? 'MESSAGE',
  const connectionID = undefined // TODO: Retrieve connectionId if available,
  return {
    requestID,
    eventType,
    connectionID,
    token: getAuthorizationToken(request),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: body as any,
  }
}

function getAuthorizationToken(request: IncomingMessage): string | undefined {
  try {
    const cookieToken = request.headers.cookie && parse(request.headers.cookie)['session-token']
    if (cookieToken) return cookieToken
  } catch (_e) {
    // Could not parse cookie header
  }
  return request.headers.authorization
}
