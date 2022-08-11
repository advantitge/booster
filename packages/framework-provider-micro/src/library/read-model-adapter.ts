import { getLogger } from '@boostercloud/framework-common-helpers'
import {
  BoosterConfig,
  FilterFor,
  ReadModelEnvelope,
  ReadModelInterface,
  ReadModelListResult,
  ReadOnlyNonEmptyArray,
  SequenceKey,
  SortFor,
  UUID,
} from '@boostercloud/framework-types'

import { getCollection } from '../services/db'
import { queryRecordFor } from './searcher-adapter'

export async function rawReadModelEventsToEnvelopes(
  _config: BoosterConfig,
  rawEvents: Array<unknown>
): Promise<Array<ReadModelEnvelope>> {
  return rawEvents as Array<ReadModelEnvelope>
}

export async function fetchReadModel(
  config: BoosterConfig,
  readModelName: string,
  readModelID: UUID,
  sequenceKey?: SequenceKey
): Promise<ReadOnlyNonEmptyArray<ReadModelInterface>> {
  const logger = getLogger(config, 'ReadModelAdapter#fetchReadModel')
  if (sequenceKey) {
    logger.info('sequencedBy not implemented for framework-provider-micro!')
  }
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  const readModel = await collection.findOne<ReadModelInterface>({ _id: readModelID })
  if (!readModel) {
    logger.debug(`[ReadModelAdapter#fetchReadModel] Read model ${readModelName} with ID ${readModelID} not found`)
    return [] as any // TODO: cannot return empty array or array with undefined/null..?
  } else {
    logger.debug(
      `[ReadModelAdapter#fetchReadModel] Loaded read model ${readModelName} with ID ${readModelID} with result:`,
      readModel
    )
    const { _id, ...readModelWithoutId } = readModel
    return [{ ...readModelWithoutId, id: _id }]
  }
}

export async function storeReadModel(
  config: BoosterConfig,
  readModelName: string,
  { id: _id, ...readModel }: ReadModelInterface,
  _expectedCurrentVersion: number
): Promise<void> {
  const logger = getLogger(config, 'ReadModelAdapter#storeReadModel')
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  logger.debug('[ReadModelAdapter#storeReadModel] Storing readModel ' + JSON.stringify(readModel))
  await collection.replaceOne({ _id }, { _id, ...readModel }, { upsert: true })
  logger.debug('[ReadModelAdapter#storeReadModel] Read model stored')
}

export async function searchReadModel(
  config: BoosterConfig,
  readModelName: string,
  filters: FilterFor<unknown>,
  sortBy?: SortFor<unknown>,
  limit?: number,
  afterCursor?: { index: number } | undefined,
  paginatedVersion = false
): Promise<Array<any> | ReadModelListResult<any>> {
  const logger = getLogger(config, 'ReadModelAdapter#searchReadModel')
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  logger.debug('Converting filter to query')
  const query = queryRecordFor(readModelName, filters)
  logger.debug('Got query ', query)
  const stages = [
    { $match: query },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...([sortBy && Object.keys(sortBy).length > 0 && { $sort: convertSortBy(sortBy) }] as any),
    { $skip: afterCursor?.index || 0 },
    ...[limit != 0 && { $limit: limit ?? 1000 }],
    { $addFields: { id: '$_id' } },
    { $project: { _id: 0 } },
  ].filter(Boolean)
  const result = await collection.aggregate<ReadModelEnvelope>(stages).toArray()
  logger.debug('[ReadModelAdapter#searchReadModel] Search result: ', result)
  if (paginatedVersion) {
    const count = await collection.count(query)
    return {
      items: result,
      count,
      cursor: { index: ((afterCursor?.index || 0) + result.length) as any },
    }
  } else {
    return result
  }
}

export async function deleteReadModel(
  config: BoosterConfig,
  readModelName: string,
  readModel: ReadModelInterface
): Promise<void> {
  const logger = getLogger(config, 'ReadModelAdapter#deleteReadModel')
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  logger.debug('[ReadModelAdapter#deleteReadModel] Deleting readModel ' + JSON.stringify(readModel))
  await collection.deleteOne({ _id: readModel.id })
  logger.debug('[ReadModelAdapter#deleteReadModel] Read model deleted')
}

function convertSortBy(sortBy?: SortFor<unknown>): { [field: string]: 1 | -1 } {
  if (sortBy) {
    return Object.entries(sortBy).reduce((acc, [field, direction]) => {
      acc[field] = direction === 'ASC' ? 1 : -1
      return acc
    }, {} as { [field: string]: 1 | -1 })
  } else {
    return {}
  }
}
