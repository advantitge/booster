import { ProviderLibrary } from '@boostercloud/framework-types'

import { Infrastructure } from './infrastructure/infrastructure'
import { requestFailed, requestSucceeded } from './library/api-adapter'
import {
  rawEventsToEnvelopes,
  readEntityEventsSince,
  readEntityLatestSnapshot,
  storeEvents,
} from './library/events-adapter'
import { searchEvents, searchEntitiesIds } from './library/events-searcher-adapter'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'
import {
  fetchReadModel,
  rawReadModelEventsToEnvelopes,
  searchReadModel,
  storeReadModel,
  deleteReadModel,
} from './library/read-model-adapter'
import { requestHandler } from './services/request-handler'

export const Provider = (): ProviderLibrary => ({
  // ProviderEventsLibrary
  events: {
    rawToEnvelopes: rawEventsToEnvelopes,
    forEntitySince: readEntityEventsSince,
    latestEntitySnapshot: readEntityLatestSnapshot,
    store: storeEvents,
    search: searchEvents,
    searchEntitiesIDs: searchEntitiesIds,
  },
  // ProviderReadModelsLibrary
  readModels: {
    rawToEnvelopes: rawReadModelEventsToEnvelopes,
    fetch: fetchReadModel,
    search: searchReadModel,
    store: storeReadModel,
    delete: deleteReadModel,
    subscribe: notImplemented,
    fetchSubscriptions: notImplemented,
    deleteSubscription: notImplemented,
    deleteAllSubscriptions: notImplemented,
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
    storeData: notImplemented,
    fetchData: notImplemented,
    deleteData: notImplemented,
    sendMessage: notImplemented,
  },
  // ScheduledCommandsLibrary
  scheduled: {
    rawToEnvelope: notImplemented,
  },
  // ProviderInfrastructureGetter
  infrastructure: () => Infrastructure(requestHandler),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function notImplemented(): any {}
