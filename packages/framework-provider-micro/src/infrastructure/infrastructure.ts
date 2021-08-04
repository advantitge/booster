import { BoosterConfig, ProviderInfrastructure } from '@boostercloud/framework-types'
import micro, { RequestHandler } from 'micro'
import { getCollection } from '../services/db'

export const Infrastructure = (requestHandler: RequestHandler): ProviderInfrastructure => ({
  start: async (config: BoosterConfig, port: number) => {
    await initDatabase(config)
    micro(requestHandler).listen(port)
  },
})

const eventsStoreAttributes = {
  partitionKeys: { entityTypeName: 1, entityID: 1, kind: 1 },
  sortKey: 'createdAt',
  indexByEntity: {
    name: (config: BoosterConfig) => config.resourceNames.eventsStore + '-index-by-entity',
    partitionKeys: { entityTypeName: 1, kind: 1 },
  },
  indexByType: {
    name: (config: BoosterConfig) => config.resourceNames.eventsStore + '-index-by-type',
    partitionKeys: { typeName: 1 },
  },
} as const

async function initDatabase(config: BoosterConfig): Promise<void> {
  await initEventsDatabase(config)
  await initReadModelsDatabase(config)
}

async function initEventsDatabase(config: BoosterConfig): Promise<void> {
  const collection = await getCollection(config.resourceNames.eventsStore)
  await collection.createIndex({ ...eventsStoreAttributes.partitionKeys, [eventsStoreAttributes.sortKey]: -1 })
  await collection.createIndex(
    { ...eventsStoreAttributes.indexByEntity.partitionKeys, [eventsStoreAttributes.sortKey]: -1 },
    { name: eventsStoreAttributes.indexByEntity.name(config) }
  )
  await collection.createIndex(
    { ...eventsStoreAttributes.indexByType.partitionKeys, [eventsStoreAttributes.sortKey]: -1 },
    { name: eventsStoreAttributes.indexByType.name(config) }
  )
}

async function initReadModelsDatabase(config: BoosterConfig): Promise<void> {
  for (const readModelName of Object.keys(config.readModels)) {
    const collection = await getCollection(config.resourceNames.forReadModel(readModelName))
    await collection.createIndex({ _id: 1 }) // Not needed, auto created by MongoDB but might be useful to extend this init code in the future
  }
}
