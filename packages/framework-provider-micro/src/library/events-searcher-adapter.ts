import { getLogger } from '@boostercloud/framework-common-helpers'
import {
  BoosterConfig,
  EventDeleteParameters,
  EventEnvelope,
  EventInterface,
  EventSearchParameters,
  EventSearchResponse,
  PaginatedEntitiesIdsResult,
} from '@boostercloud/framework-types'

import { Filter } from 'mongodb'
import { getCollection } from '../services/db'

type DatabaseEventEnvelope = Omit<EventEnvelope, 'createdAt'> & { createdAt: Date }

// Remember to use the same order as the index fields
function formEventQuery(parameters: EventSearchParameters | EventDeleteParameters): Filter<DatabaseEventEnvelope> {
  if (!('entity' in parameters) && !('type' in parameters))
    throw new Error('Invalid search event query. It is neither an search by "entity" nor a search by "type"')

  return {
    kind: { $eq: 'event' },
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    ...('entity' in parameters && { entityTypeName: { $eq: parameters.entity } }),
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    ...('entityID' in parameters && { entityID: { $eq: parameters.entityID } }),
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    ...('type' in parameters && { typeName: { $eq: parameters.type } }),
    createdAt: {
      $gte: parameters.from ? new Date(parameters.from) : new Date(0),
      $lte: parameters.to ? new Date(parameters.to) : new Date(),
    },
  }
}

export async function searchEvents(
  config: BoosterConfig,
  parameters: EventSearchParameters
): Promise<Array<EventSearchResponse>> {
  const logger = getLogger(config, 'EventsSearcherAdapter#searchEvents')
  logger.debug('Initiating an events search. Filters: ', parameters)
  const query = formEventQuery(parameters)
  const collection = await getCollection(config.resourceNames.eventsStore)
  const eventEnvelopes = await collection.find<DatabaseEventEnvelope>(query).sort({ createdAt: 1 }).toArray()
  logger.debug('Events search result: ', eventEnvelopes)
  return eventEnvelopes.map((e) => ({
    ...e,
    createdAt: e.createdAt.toJSON(),
    type: e.typeName,
    entity: e.entityTypeName,
    value: e.value as EventInterface,
  }))
}

export async function deleteEvents(config: BoosterConfig, parameters: EventSearchParameters): Promise<void> {
  const logger = getLogger(config, 'EventsSearcherAdapter#deleteEvents')
  logger.debug('Initiating an events search and delete. Filters: ', parameters)
  const query = formEventQuery(parameters)
  const collection = await getCollection(config.resourceNames.eventsStore)
  const deleteResult = await collection.deleteMany(query)
  logger.debug('Events delete result: ', deleteResult)
}

export async function searchEntitiesIds(
  config: BoosterConfig,
  limit: number,
  afterCursor: { index: string } | undefined,
  entityTypeName: string
): Promise<PaginatedEntitiesIdsResult> {
  const logger = getLogger(config, 'EventsSearcherAdapter#searchEntitiesIds')
  logger.debug('Initiating an entity search. Filter: ', { limit, afterCursor, entityTypeName })
  const skip = +(afterCursor?.index || 0)
  const collection = await getCollection(config.resourceNames.eventsStore)
  const items = await collection
    .find<DatabaseEventEnvelope>(
      {
        kind: { $eq: 'snapshot' },
        entityTypeName: { $eq: entityTypeName },
      },
      {
        limit: limit ?? 1000,
        skip,
        projection: {
          _id: 0,
          entityID: 1,
        },
      }
    )
    .sort({ createdAt: 1 })
    .toArray()
  logger.debug('Entity search result: ', items)
  return { items, count: items.length, cursor: { index: `${skip + items.length}` } }
}
