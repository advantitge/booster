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

function formEventQuery(parameters: EventSearchParameters | EventDeleteParameters): Filter<DatabaseEventEnvelope> {
  const query: Filter<DatabaseEventEnvelope> = {
    kind: { $eq: 'event' },
    createdAt: {
      $gte: parameters.from ? new Date(parameters.from) : new Date(0),
      $lte: parameters.to ? new Date(parameters.to) : new Date(),
    },
  }
  if (!('entity' in parameters) && !('type' in parameters))
    throw new Error('Invalid search event query. It is neither an search by "entity" nor a search by "type"')
  if ('entity' in parameters) {
    query.entityTypeName = { $eq: parameters.entity }
    if (parameters.entityID) {
      query.entityID = { $eq: parameters.entityID }
    }
  }
  if ('type' in parameters) {
    query.typeName = { $eq: parameters.type }
  }
  return query
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
  afterCursor: Record<string, string> | undefined,
  entityTypeName: string
): Promise<PaginatedEntitiesIdsResult> {
  throw new Error('EventsSearcherAdapter#searchEntitiesIds: Not implemented yet')
}
