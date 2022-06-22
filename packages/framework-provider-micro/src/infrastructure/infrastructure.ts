import { BoosterConfig, ProviderInfrastructure } from '@boostercloud/framework-types'
import micro, { RequestHandler } from 'micro'
import { getCollection } from '../services/db'

export const Infrastructure = (requestHandler: RequestHandler): ProviderInfrastructure => ({
  start: async (config: BoosterConfig, port: number) => {
    await init(config)
    micro(requestHandler).listen(port)
  },
})

async function init(config: BoosterConfig): Promise<void> {
  await indexEventsCollection(config)
  await indexReadModelsCollections(config)
}

async function indexEventsCollection(config: BoosterConfig): Promise<void> {
  const eventsCollectionName = config.resourceNames.eventsStore
  const collection = await getCollection(eventsCollectionName)
  await collection.createIndex({ entityTypeName: 1, entityID: 1, kind: 1, createdAt: -1 })
  await collection.createIndex({ entityID: 1, entityTypeName: 1, kind: 1, createdAt: -1 })
  await collection.createIndex({ entityTypeName: 1, kind: 1, createdAt: -1 })
  await collection.createIndex({ typeName: 1, createdAt: -1 })
  await collection.createIndex({ kind: 1, createdAt: -1 })
}

async function indexReadModelsCollections(config: BoosterConfig): Promise<void> {
  for (const readModelName of Object.keys(config.readModels)) {
    const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
    await collection.createIndex({ _id: 1 }) // Not needed, auto created by MongoDB but might be useful to extend this init code in the future
  }
}
