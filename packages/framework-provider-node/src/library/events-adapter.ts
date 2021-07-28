import {
  UUID,
  UserApp,
  Logger,
  BoosterConfig,
  EventEnvelope,
  OptimisticConcurrencyUnexpectedVersionError,
} from '@boostercloud/framework-types'
import { retryIfError } from '@boostercloud/framework-common-helpers'
import { Registry } from '../registry'

const originOfTime = new Date(0).toISOString()

export function rawEventsToEnvelopes(rawEvents: Array<unknown>): Array<EventEnvelope> {
  return rawEvents.map((event) => event as EventEnvelope)
}

export async function readEntityEventsSince(
  eventRegistry: Registry<EventEnvelope>,
  config: BoosterConfig,
  logger: Logger,
  entityTypeName: string,
  entityID: UUID,
  since?: string
): Promise<Array<EventEnvelope>> {
  const fromTime = since ? since : originOfTime

  const query = {
    entityID: entityID,
    entityTypeName: entityTypeName,
    kind: 'event' as const,
    createdAt: {
      $gt: fromTime,
    },
  }
  const result: Array<EventEnvelope> = await eventRegistry.query(query)

  logger.debug(
    `[EventsAdapter#readEntityEventsSince] Loaded events for entity ${entityTypeName} with ID ${entityID} with result:`,
    result
  )
  return result
}

export async function readEntityLatestSnapshot(
  eventRegistry: Registry<EventEnvelope>,
  config: BoosterConfig,
  logger: Logger,
  entityTypeName: string,
  entityID: UUID
): Promise<EventEnvelope | null> {
  const query = {
    entityID: entityID,
    entityTypeName: entityTypeName,
    kind: 'snapshot' as const,
  }

  const snapshot = (await eventRegistry.queryLatest(query)) as EventEnvelope

  if (snapshot) {
    logger.debug(
      `[EventsAdapter#readEntityLatestSnapshot] Snapshot found for entity ${entityTypeName} with ID ${entityID}:`,
      snapshot
    )
    return snapshot as EventEnvelope
  } else {
    logger.debug(
      `[EventsAdapter#readEntityLatestSnapshot] No snapshot found for entity ${entityTypeName} with ID ${entityID}.`
    )
    return null
  }
}

export async function storeEvents(
  userApp: UserApp,
  eventRegistry: Registry<EventEnvelope>,
  eventEnvelopes: Array<EventEnvelope>,
  _config: BoosterConfig,
  logger: Logger
): Promise<void> {
  logger.debug('[EventsAdapter#storeEvents] Storing the following event envelopes:', eventEnvelopes)
  for (const eventEnvelope of eventEnvelopes) {
    await retryIfError(
      logger,
      () => persistEvent(eventRegistry, eventEnvelope),
      OptimisticConcurrencyUnexpectedVersionError
    )
  }
  logger.debug('[EventsAdapter#storeEvents] EventEnvelopes stored')

  await userApp.boosterEventDispatcher(eventEnvelopes)
}

async function persistEvent(eventRegistry: Registry<EventEnvelope>, eventEnvelope: EventEnvelope): Promise<void> {
  await eventRegistry.insert(eventEnvelope)

  //TODO check the exception raised when there is a write error,
  //to implement Optimistic Concurrency approach
  //if (e.name == 'TODO') {
  //  throw new OptimisticConcurrencyUnexpectedVersionError(e.message)
  //}
}
