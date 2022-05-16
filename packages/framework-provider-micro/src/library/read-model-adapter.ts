import {
  BoosterConfig,
  FilterFor,
  Logger,
  ReadModelEnvelope,
  ReadModelInterface,
  ReadModelListResult,
  ReadOnlyNonEmptyArray,
  SequenceKey,
  UUID,
} from '@boostercloud/framework-types'

import { getCollection } from '../services/db'
import { queryRecordFor } from './searcher-adapter'

export async function rawReadModelEventsToEnvelopes(
  _config: BoosterConfig,
  _logger: Logger,
  rawEvents: Array<unknown>
): Promise<Array<ReadModelEnvelope>> {
  return rawEvents as Array<ReadModelEnvelope>
}

export async function fetchReadModel(
  config: BoosterConfig,
  logger: Logger,
  readModelName: string,
  readModelID: UUID,
  sequenceKey?: SequenceKey
): Promise<ReadOnlyNonEmptyArray<ReadModelInterface>> {
  if (sequenceKey) {
    logger.info('sequencedBy not implemented for framework-provider-micro!')
  }
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  const readModel = (await collection.findOne({ _id: readModelID })) as ReadModelInterface
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
  logger: Logger,
  readModelName: string,
  { id: _id, ...readModel }: ReadModelInterface,
  _expectedCurrentVersion: number
): Promise<void> {
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  logger.debug('[ReadModelAdapter#storeReadModel] Storing readModel ' + JSON.stringify(readModel))
  await collection.replaceOne({ _id }, { _id, ...readModel }, { upsert: true })
  logger.debug('[ReadModelAdapter#storeReadModel] Read model stored')
}

export async function searchReadModel(
  config: BoosterConfig,
  logger: Logger,
  readModelName: string,
  filters: FilterFor<unknown>,
  limit?: number,
  afterCursor?: { index: number },
  paginatedVersion = false
): Promise<Array<any> | ReadModelListResult<any>> {
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  logger.debug('Converting filter to query')
  const query = queryRecordFor(readModelName, filters)
  logger.debug('Got query ', query)
  const result = await collection
    .aggregate<ReadModelEnvelope>([
      { $match: query },
      { $skip: afterCursor?.index || 0 },
      { $limit: limit || 1000 },
      { $addFields: { id: '$_id' } },
      { $project: { _id: 0 } },
    ])
    .toArray()
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
  logger: Logger,
  readModelName: string,
  readModel: ReadModelInterface
): Promise<void> {
  const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
  logger.debug('[ReadModelAdapter#deleteReadModel] Deleting readModel ' + JSON.stringify(readModel))
  await collection.deleteOne({ _id: readModel.id })
  logger.debug('[ReadModelAdapter#deleteReadModel] Read model deleted')
}
