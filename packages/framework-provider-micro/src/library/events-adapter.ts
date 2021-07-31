import { BoosterConfig, EventEnvelope, Logger, UserApp, UUID } from '@boostercloud/framework-types'

import { getCollection } from '../db'

export function rawEventsToEnvelopes(rawEvents: Array<unknown>): Array<EventEnvelope> {
    return rawEvents as Array<EventEnvelope>
}

export async function readEntityEventsSince(
    config: BoosterConfig,
    logger: Logger,
    entityTypeName: string,
    entityID: UUID,
    since?: string,
): Promise<Array<EventEnvelope>> {
    const query = {
        entityID: entityID,
        entityTypeName: entityTypeName,
        kind: 'event' as const,
        createdAt: {
            $gt: since || new Date(0).toISOString(),
        },
    }
    const collection = await getCollection(config.resourceNames.eventsStore)
    const result = await collection.find(query).sort({ createdAt: 1 }).toArray<EventEnvelope>()

    logger.debug(
        `[EventsAdapter#readEntityEventsSince] Loaded events for entity ${entityTypeName} with ID ${entityID} with result:`,
        result,
    )
    return result
}

export async function readEntityLatestSnapshot(
    config: BoosterConfig,
    logger: Logger,
    entityTypeName: string,
    entityID: UUID,
): Promise<EventEnvelope | null> {
    const query = {
        entityID: entityID,
        entityTypeName: entityTypeName,
        kind: 'snapshot' as const,
    }
    const collection = await getCollection(config.resourceNames.eventsStore)
    const events = await collection.find(query).sort({ createdAt: -1 }).limit(1).toArray<EventEnvelope>()
    const snapshot = events?.[0]

    if (snapshot) {
        logger.debug(`[EventsAdapter#readEntityLatestSnapshot] Snapshot found for entity ${entityTypeName} with ID ${entityID}:`, snapshot)
        return snapshot
    } else {
        logger.debug(`[EventsAdapter#readEntityLatestSnapshot] No snapshot found for entity ${entityTypeName} with ID ${entityID}.`)
        return null
    }
}

export async function storeEvents(
    userApp: UserApp,
    eventEnvelopes: Array<EventEnvelope>,
    config: BoosterConfig,
    logger: Logger,
): Promise<void> {
    const collection = await getCollection(config.resourceNames.eventsStore)
    logger.debug('[EventsAdapter#storeEvents] Storing the following event envelopes:', eventEnvelopes)
    await collection.insertMany(eventEnvelopes)
    logger.debug('[EventsAdapter#storeEvents] EventEnvelopes stored')

    await userApp.boosterEventDispatcher(eventEnvelopes)
}
