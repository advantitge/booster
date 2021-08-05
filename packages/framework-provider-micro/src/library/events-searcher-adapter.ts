import {
  BoosterConfig,
  EventEnvelope,
  EventFilter,
  EventInterface,
  EventSearchResponse,
  Logger,
} from '@boostercloud/framework-types'
import { Filter } from 'mongodb'
import { getCollection } from '../services/db'

export async function searchEvents(
  config: BoosterConfig,
  logger: Logger,
  filters: EventFilter
): Promise<Array<EventSearchResponse>> {
  logger.debug('Initiating an events search. Filters: ', filters)
  const query: Filter<Omit<EventEnvelope, 'createdAt'> & { createdAt: Date }> = {
    kind: { $eq: 'event' },
    createdAt: {
      $gte: filters.from ? new Date(filters.from) : new Date(0),
      $lte: filters.to ? new Date(filters.to) : new Date(),
    },
  }
  if ('entity' in filters) {
    query.entityTypeName = { $eq: filters.entity }
    if (filters.entityID) {
      query.entityID = { $eq: filters.entityID }
    }
  } else if ('type' in filters) {
    query.typeName = { $eq: filters.type }
  } else {
    throw new Error('Invalid search event query. It is neither an search by "entity" nor a search by "type"')
  }
  const collection = await getCollection(config.resourceNames.eventsStore)
  const eventEnvelopes = await collection.find(query).sort({ createdAt: -1 }).toArray<EventEnvelope>()
  logger.debug('Events search result: ', eventEnvelopes)
  return eventEnvelopes.map((e) => ({
    ...e,
    type: e.typeName,
    entity: e.entityTypeName,
    value: e.value as EventInterface,
  }))
}
