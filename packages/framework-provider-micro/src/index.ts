import {
    Booster,
    boosterEventDispatcher,
    boosterNotifySubscribers,
    boosterServeGraphQL,
    boosterTriggerScheduledCommand,
} from '@boostercloud/framework-core'
import { ProviderLibrary } from '@boostercloud/framework-types'

import { createRequestHandler, Infrastructure } from './infrastructure'
import { requestFailed, requestSucceeded } from './library/api-adapter'
import { rawEventsToEnvelopes, readEntityEventsSince, readEntityLatestSnapshot, storeEvents } from './library/events-adapter'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'
import { fetchReadModel, rawReadModelEventsToEnvelopes, searchReadModel, storeReadModel } from './library/read-model-adapter'

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const userApp: UserApp = require(path.join(process.cwd(), 'dist', 'index.js'))
const userApp = { Booster, boosterEventDispatcher, boosterServeGraphQL, boosterNotifySubscribers, boosterTriggerScheduledCommand } as any
export const handleRequest = createRequestHandler(userApp)

export const Provider = (): ProviderLibrary => ({
    // ProviderEventsLibrary
    events: {
        rawToEnvelopes: rawEventsToEnvelopes,
        forEntitySince: readEntityEventsSince,
        latestEntitySnapshot: readEntityLatestSnapshot,
        store: storeEvents.bind(null, userApp),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: undefined as any,
    },
    // ProviderReadModelsLibrary
    readModels: {
        rawToEnvelopes: rawReadModelEventsToEnvelopes,
        fetch: fetchReadModel,
        search: searchReadModel,
        store: storeReadModel,
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
    infrastructure: () => Infrastructure(handleRequest),
})

// eslint-disable-next-line @typescript-eslint/no-empty-function
function notImplemented(): void {}
