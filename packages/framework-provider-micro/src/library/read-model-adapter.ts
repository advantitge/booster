import { BoosterConfig, FilterFor, Logger, ReadModelEnvelope, ReadModelInterface, UUID } from '@boostercloud/framework-types'

import { getCollection } from '../db'
import { queryRecordFor } from './searcher-adapter'

export async function rawReadModelEventsToEnvelopes(
    config: BoosterConfig,
    logger: Logger,
    rawEvents: Array<unknown>,
): Promise<Array<ReadModelEnvelope>> {
    return rawEvents as Array<ReadModelEnvelope>
}

export async function fetchReadModel(
    config: BoosterConfig,
    logger: Logger,
    readModelName: string,
    readModelID: UUID,
): Promise<ReadModelInterface> {
    const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
    const readModel = await collection.findOne({ _id: readModelID, typeName: readModelName })
    if (!readModel) {
        logger.debug(`[ReadModelAdapter#fetchReadModel] Read model ${readModelName} with ID ${readModelID} not found`)
    } else {
        logger.debug(
            `[ReadModelAdapter#fetchReadModel] Loaded read model ${readModelName} with ID ${readModelID} with result:`,
            readModel.value,
        )
    }
    return readModel?.value
}

export async function storeReadModel(
    config: BoosterConfig,
    logger: Logger,
    readModelName: string,
    readModel: ReadModelInterface,
    _expectedCurrentVersion: number,
): Promise<void> {
    const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
    logger.debug('[ReadModelAdapter#storeReadModel] Storing readModel ' + JSON.stringify(readModel))
    await collection.replaceOne(
        { _id: readModel.id, typeName: readModelName },
        { typeName: readModelName, value: readModel },
        { upsert: true },
    )
    logger.debug('[ReadModelAdapter#storeReadModel] Read model stored')
}

export async function searchReadModel(
    config: BoosterConfig,
    logger: Logger,
    readModelName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: FilterFor<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Array<any>> {
    const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
    logger.debug('Converting filter to query')
    const query = queryRecordFor(readModelName, filters)
    logger.debug('Got query ', query)
    const result = await collection.find(query).toArray<ReadModelEnvelope>()
    logger.debug('[ReadModelAdapter#searchReadModel] Search result: ', result)
    return result.map((envelope) => envelope.value)
}
