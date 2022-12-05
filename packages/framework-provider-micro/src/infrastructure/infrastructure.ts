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

/* Make sure to use the same order in the query fields as in the index fields */
async function indexEventsCollection(config: BoosterConfig): Promise<void> {
  const eventsCollectionName = config.resourceNames.eventsStore
  const collection = await getCollection(eventsCollectionName)
  await collection.createIndex(
    { kind: 1, entityTypeName: 1, entityID: 1, createdAt: -1 },
    { name: '1_kind_entityTypeName_entityID_createdAt' }
  )
  await collection.createIndex(
    { kind: 1, entityTypeName: 1, createdAt: -1 },
    { name: '2_kind_entityTypeName_createdAt' }
  )
  await collection.createIndex({ kind: 1, createdAt: -1 }, { name: '3_kind_createdAt' })

  await collection.createIndex({ kind: 1, typeName: 1, createdAt: -1 }, { name: '4_kind_typeName_createdAt' })
}

async function indexReadModelsCollections(config: BoosterConfig): Promise<void> {
  for (const [readModelName, indexSet] of Object.entries(config.readModelIndexKeys)) {
    const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
    await Promise.all(indexSet.forEach((propertyName) => collection.createIndex({ [propertyName]: 1 })))
  }
}
