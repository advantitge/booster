import { getLogger } from '@boostercloud/framework-common-helpers'
import {
  BoosterConfig,
  EventEnvelope,
  EventInterface,
  EventSearchParameters,
  EventSearchResponse,
  PaginatedEntitiesIdsResult,
} from '@boostercloud/framework-types'

import { Filter, FindOptions } from 'mongodb'
import { getCollection } from '../services/db'

type DatabaseEventEnvelope = Omit<EventEnvelope, 'createdAt'> & { createdAt: Date }

export async function searchEvents(
  config: BoosterConfig,
  parameters: EventSearchParameters
): Promise<Array<EventSearchResponse>> {
  const logger = getLogger(config, 'EventsSearcherAdapter#searchEvents')
  logger.debug('Initiating an events search. Filters: ', parameters)
  const query: Filter<DatabaseEventEnvelope> = {
    kind: { $eq: 'event' },
    createdAt: {
      $gte: parameters.from ? new Date(parameters.from) : new Date(0),
      $lte: parameters.to ? new Date(parameters.to) : new Date(),
    },
  }
  if ('entity' in parameters) {
    query.entityTypeName = { $eq: parameters.entity }
    if (parameters.entityID) {
      query.entityID = { $eq: parameters.entityID }
    }
  } else if ('type' in parameters) {
    query.typeName = { $eq: parameters.type }
  } else {
    throw new Error('Invalid search event query. It is neither an search by "entity" nor a search by "type"')
  }
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
      { kind: { $eq: 'snapshot' }, entityTypeName: { $eq: entityTypeName } },
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
