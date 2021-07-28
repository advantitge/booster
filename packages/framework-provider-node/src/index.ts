import { EventEnvelope, ProviderLibrary, ReadModelEnvelope, UserApp } from '@boostercloud/framework-types'
import {
  rawEventsToEnvelopes,
  readEntityEventsSince,
  readEntityLatestSnapshot,
  storeEvents,
} from './library/events-adapter'
import { requestSucceeded, requestFailed } from './library/api-adapter'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'

import * as path from 'path'
import {
  fetchReadModel,
  rawReadModelEventsToEnvelopes,
  searchReadModel,
  storeReadModel,
} from './library/read-model-adapter'
import { Infrastructure } from './infrastructure'
import { Registry } from './registry'

const url = 'mongodb://localhost:27017/booster'
const eventRegistry = new Registry<EventEnvelope>(process.env.DB_URL_EVENTS || url, 'events')
const readModelRegistry = new Registry<ReadModelEnvelope>(process.env.DB_URL_READMODELS || url, 'read_models')
const userApp: UserApp = require(path.join(process.cwd(), 'dist', 'index.js'))

export const Provider = (): ProviderLibrary => ({
  // ProviderEventsLibrary
  events: {
    rawToEnvelopes: rawEventsToEnvelopes,
    forEntitySince: readEntityEventsSince.bind(null, eventRegistry),
    latestEntitySnapshot: readEntityLatestSnapshot.bind(null, eventRegistry),
    store: storeEvents.bind(null, userApp, eventRegistry),
    search: undefined as any,
  },
  // ProviderReadModelsLibrary
  readModels: {
    rawToEnvelopes: rawReadModelEventsToEnvelopes,
    fetch: fetchReadModel.bind(null, readModelRegistry),
    search: searchReadModel.bind(null, readModelRegistry),
    store: storeReadModel.bind(null, readModelRegistry),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchSubscriptions: undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteSubscription: undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteAllSubscriptions: undefined as any,
  },
  // ProviderGraphQLLibrary
  graphQL: {
    rawToEnvelope: rawGraphQLRequestToEnvelope,
    handleResult: requestSucceeded,
  },
  // ProviderAPIHandling
  api: {
    requestSucceeded,
    requestFailed,
  },
  connections: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storeData: notImplemented as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchData: notImplemented as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteData: notImplemented as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMessage: notImplemented as any,
  },
  // ScheduledCommandsLibrary
  scheduled: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawToEnvelope: undefined as any,
  },
  // ProviderInfrastructureGetter
  infrastructure: () => Infrastructure(userApp),
})

function notImplemented(): void {}
