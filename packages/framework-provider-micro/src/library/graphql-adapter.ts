import { GraphQLRequestEnvelope, GraphQLRequestEnvelopeError, Logger, UUID } from '@boostercloud/framework-types'
import { IncomingMessage } from 'http'
import { json } from 'micro'

export async function rawGraphQLRequestToEnvelope(
  request: IncomingMessage,
  logger: Logger
): Promise<GraphQLRequestEnvelope | GraphQLRequestEnvelopeError> {
  const body = await json(request)

  logger.debug('Received GraphQL request: \n- Headers: ', request.headers, '\n- Body: ', body)
  const requestID = UUID.generate() // TODO: Retrieve request ID from request
  const eventType = 'MESSAGE' // TODO: (request.requestContext?.eventType as GraphQLRequestEnvelope['eventType']) ?? 'MESSAGE',
  const connectionID = undefined // TODO: Retrieve connectionId if available,
  try {
    return {
      requestID,
      eventType,
      connectionID,
      token: request.headers.authorization,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: body as any,
    }
  } catch (e) {
    return {
      error: e,
      requestID,
      connectionID,
      eventType,
    }
  }
}
