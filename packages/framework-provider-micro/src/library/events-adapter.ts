import { getLogger } from '@boostercloud/framework-common-helpers'
import { boosterEventDispatcher } from '@boostercloud/framework-core'
import { BoosterConfig, EventEnvelope, UUID } from '@boostercloud/framework-types'

import { getCollection } from '../services/db'

export function rawEventsToEnvelopes(rawEvents: Array<unknown>): Array<EventEnvelope> {
  return rawEvents as Array<EventEnvelope>
}

export async function readEntityEventsSince(
  config: BoosterConfig,
  entityTypeName: string,
  entityID: UUID,
  since?: string
): Promise<Array<EventEnvelope>> {
  const logger = getLogger(config, 'EventsAdapter#readEntityEventsSince')
  const query = {
    kind: 'event' as const,
    entityTypeName: entityTypeName,
    entityID: entityID,
    createdAt: {
      $gt: since ? new Date(since) : new Date(0),
    },
  }
  const collection = await getCollection(config.resourceNames.eventsStore)
  const result = await collection.find<EventEnvelope>(query).sort({ createdAt: 1 }).toArray()

  logger.debug(
    `[EventsAdapter#readEntityEventsSince] Loaded events for entity ${entityTypeName} with ID ${entityID} with result:`,
    result
  )
  return result
}

export async function readEntityLatestSnapshot(
  config: BoosterConfig,
  entityTypeName: string,
  entityID: UUID
): Promise<EventEnvelope | null> {
  const query = {
    kind: 'snapshot' as const,
    entityTypeName: entityTypeName,
    entityID: entityID,
  }
  const logger = getLogger(config, 'EventsAdapter#readEntityLatestSnapshot')
  const collection = await getCollection(config.resourceNames.eventsStore)
  const events = await collection.find<EventEnvelope>(query).sort({ createdAt: -1 }).limit(1).toArray()
  const snapshot = events?.[0]

  if (snapshot) {
    logger.debug(
      `[EventsAdapter#readEntityLatestSnapshot] Snapshot found for entity ${entityTypeName} with ID ${entityID}:`,
      snapshot
    )
    return snapshot
  } else {
    logger.debug(
      `[EventsAdapter#readEntityLatestSnapshot] No snapshot found for entity ${entityTypeName} with ID ${entityID}.`
    )
    return null
  }
}

export async function deleteEntitySnapshots(
  config: BoosterConfig,
  entityTypeName: string,
  entityID: UUID
): Promise<void> {
  const logger = getLogger(config, 'EventsAdapter#deleteEntitySnapshots')
  const query = {
    entityID: entityID,
    entityTypeName: entityTypeName,
    kind: 'snapshot' as const,
  }
  const collection = await getCollection(config.resourceNames.eventsStore)
  const deleteResult = await collection.deleteMany(query)
  logger.debug(
    `[EventsAdapter#deleteEntitySnapshots] Deleting snapshot(s) for entity ${entityTypeName} with ID ${entityID}: `,
    deleteResult
  )
}

export async function storeEvents(eventEnvelopes: Array<EventEnvelope>, config: BoosterConfig): Promise<void> {
  const logger = getLogger(config, 'EventsAdapter#storeEvents')
  const [events, snapshots] = [[] as Array<EventEnvelope>, [] as Array<EventEnvelope>]
  eventEnvelopes.forEach((eventEnvelope) =>
    eventEnvelope.kind === 'snapshot' ? snapshots.push(eventEnvelope) : events.push(eventEnvelope)
  )

  const collection = await getCollection(config.resourceNames.eventsStore)
  if (events.length > 0) {
    logger.debug('[EventsAdapter#storeEvents] Storing the following event envelopes for kind `event`:', events)
    await collection.insertMany(events.map((e) => ({ ...e, createdAt: new Date(e.createdAt) })))
  }

  if (snapshots.length > 0) {
    logger.debug('[EventsAdapter#storeEvents] Storing the following event envelopes for kind `snapshot`:', snapshots)
    await collection.bulkWrite(
      snapshots.map((snapshot) => ({
        updateOne: {
          filter: { entityID: snapshot.entityID, kind: 'snapshot', entityTypeName: snapshot.entityTypeName },
          update: { $set: { ...snapshot, createdAt: new Date(snapshot.createdAt) } },
          upsert: true,
        },
      }))
    )
  }

  logger.debug('[EventsAdapter#storeEvents] EventEnvelopes stored')

  await boosterEventDispatcher(eventEnvelopes)
}
