import { createInstance, createInstances } from '@boostercloud/framework-common-helpers'
import {
  BoosterConfig,
  Class,
  EntityInterface,
  EventDeleteParameters,
  EventSearchParameters,
  EventSearchResponse,
  FilterFor,
  PaginatedEntitiesIdsResult,
  FinderByKeyFunction,
  ReadModelInterface,
  ReadOnlyNonEmptyArray,
  Searcher,
  SearcherFunction,
  SequenceKey,
  SortFor,
  UUID,
} from '@boostercloud/framework-types'
import { BoosterEventDispatcher } from './booster-event-dispatcher'
import { BoosterGraphQLDispatcher } from './booster-graphql-dispatcher'
import { BoosterScheduledCommandDispatcher } from './booster-scheduled-command-dispatcher'
import { BoosterSubscribersNotifier } from './booster-subscribers-notifier'
import { Importer } from './importer'
import { EventStore } from './services/event-store'
import { BoosterRocketDispatcher } from './booster-rocket-dispatcher'
import { ReadModelStore } from './services/read-model-store'
import { BoosterEntityMigrated } from './core-concepts/data-migration/events/booster-entity-migrated'
import { BoosterDataMigrationEntity } from './core-concepts/data-migration/entities/booster-data-migration-entity'
import { BoosterDataMigrationStarted } from './core-concepts/data-migration/events/booster-data-migration-started'
import { BoosterDataMigrationFinished } from './core-concepts/data-migration/events/booster-data-migration-finished'
import { JwksUriTokenVerifier, JWT_ENV_VARS } from './services/token-verifiers'
import { BoosterAuthorizer } from './booster-authorizer'

/**
 * Main class to interact with Booster and configure it.
 * Sensible defaults are used whenever possible:
 * - `provider`: `Provider.AWS`
 * - `appName`: `new-booster-app`
 * - `region`: 'eu-west-1'
 *
 */
export class Booster {
  public static readonly configuredEnvironments: Set<string> = new Set<string>()
  public static readonly config = new BoosterConfig(checkAndGetCurrentEnv())
  /**
   * Avoid creating instances of this class
   */
  private constructor() {}

  public static configureCurrentEnv(configurator: (config: BoosterConfig) => void): void {
    configurator(this.config)
  }

  /**
   * Allows to configure the Booster project.
   *
   * @param environment The name of the environment you want to configure
   * @param configurator A function that receives the configuration object to set the values
   */
  public static configure(environment: string, configurator: (config: BoosterConfig) => void): void {
    this.configuredEnvironments.add(environment)
    if (this.config.environmentName === environment) {
      configurator(this.config)
    }
  }

  /**
   * Initializes the Booster project
   */
  public static start(codeRootPath: string): void {
    const projectRootPath = codeRootPath.replace(new RegExp(this.config.codeRelativePath + '$'), '')
    this.config.userProjectRootPath = projectRootPath
    Importer.importUserProjectFiles(codeRootPath)
    this.configureBoosterConcepts()
    this.configureDataMigrations()
    this.loadTokenVerifierFromEnv()
    this.config.validate()
  }

  /**
   * This function returns a "Searcher" configured to search instances of the read model class passed as param.
   * For more information, check the Searcher class.
   * @param readModelClass The class of the read model you what to run searches for
   */
  public static readModel<TReadModel extends ReadModelInterface>(
    readModelClass: Class<TReadModel>
  ): Searcher<TReadModel> {
    const searchFunction: SearcherFunction<TReadModel> = async (
      readModelName: string,
      filters: FilterFor<unknown>,
      sort?: SortFor<unknown>,
      limit?: number,
      afterCursor?: any,
      paginatedVersion?: boolean
    ) => {
      const searchResult = await this.config.provider.readModels.search(
        this.config,
        readModelName,
        filters,
        sort,
        limit,
        afterCursor,
        paginatedVersion
      )

      if (!Array.isArray(searchResult)) {
        return {
          ...searchResult,
          items: createInstances(readModelClass, searchResult.items),
        }
      }
      return createInstances(readModelClass, searchResult)
    }

    const finderByIdFunction: FinderByKeyFunction<TReadModel> = async (
      readModelName: string,
      id: UUID,
      sequenceKey?: SequenceKey
    ) => {
      const readModels = await this.config.provider.readModels.fetch(this.config, readModelName, id, sequenceKey)
      if (sequenceKey) {
        return readModels as ReadOnlyNonEmptyArray<TReadModel>
      }
      return readModels[0] as TReadModel
    }
    return new Searcher(readModelClass, searchFunction, finderByIdFunction)
  }

  public static async events(request: EventSearchParameters): Promise<Array<EventSearchResponse>> {
    const events: Array<EventSearchResponse> = await this.config.provider.events.search(this.config, request)
    return events.map((event) => {
      const eventMetadata = this.config.events[event.type]
      event.value = createInstance(eventMetadata.class, event.value)
      return event
    })
  }

  public static async entitiesIDs(
    entityTypeName: string,
    limit: number,
    afterCursor?: Record<string, string>
  ): Promise<PaginatedEntitiesIdsResult> {
    return await this.config.provider.events.searchEntitiesIDs(this.config, limit, afterCursor, entityTypeName)
  }

  /**
   * Fetches the last known version of an entity
   * @param entityClass Name of the entity class
   * @param entityID
   */
  public static async entity<TEntity extends EntityInterface>(
    entityClass: Class<TEntity>,
    entityID: UUID
  ): Promise<TEntity | undefined> {
    const eventStore = new EventStore(this.config)
    const entitySnapshotEnvelope = await eventStore.fetchEntitySnapshot(entityClass.name, entityID)
    return entitySnapshotEnvelope ? createInstance(entityClass, entitySnapshotEnvelope.value) : undefined
  }

  public static async deleteEntity<TEntity extends EntityInterface>(
    entityClass: Class<TEntity>,
    entityID: UUID
  ): Promise<void> {
    const eventStore = new EventStore(this.config)
    await eventStore.deleteEntitySnapshots(entityClass.name, entityID)
  }

  public static async deleteEvents(request: EventDeleteParameters): Promise<void> {
    await this.config.provider.events.delete(this.config, request)
  }

  public static async deleteReadModel<TReadModel extends ReadModelInterface>(
    readModelClass: Class<TReadModel>,
    id: UUID
  ): Promise<void> {
    await this.config.provider.readModels.delete(this.config, readModelClass.name, {
      id,
    })
  }

  public static async replay<TEntity extends EntityInterface>(
    entityClass: Class<TEntity>,
    entityID: UUID
  ): Promise<void> {
    await Booster.deleteEntity(entityClass, entityID)
    const events = await this.config.provider.events.forEntitySince(this.config, entityClass.name, entityID)
    await BoosterEventDispatcher.snapshotAndUpdateReadModels(
      this.config,
      entityClass.name,
      entityID,
      events,
      new EventStore(this.config),
      new ReadModelStore(this.config)
    )
  }

  /**
   * Dispatches event messages to your application.
   */
  public static dispatchEvent(rawEvent: unknown): Promise<unknown> {
    return BoosterEventDispatcher.dispatch(rawEvent, this.config)
  }

  public static serveGraphQL(request: unknown): Promise<unknown> {
    return new BoosterGraphQLDispatcher(this.config).dispatch(request)
  }

  public static triggerScheduledCommand(request: unknown): Promise<unknown> {
    return new BoosterScheduledCommandDispatcher(this.config).dispatch(request)
  }

  public static notifySubscribers(request: unknown): Promise<unknown> {
    return new BoosterSubscribersNotifier(this.config).dispatch(request)
  }

  public static dispatchRocket(request: unknown): Promise<unknown> {
    return new BoosterRocketDispatcher(this.config).dispatch(request)
  }

  private static configureBoosterConcepts(): void {
    this.configureDataMigrations()
  }

  private static configureDataMigrations(): void {
    this.config.events[BoosterEntityMigrated.name] = {
      class: BoosterEntityMigrated,
    }

    this.config.events[BoosterDataMigrationStarted.name] = {
      class: BoosterDataMigrationStarted,
    }

    this.config.reducers[BoosterDataMigrationStarted.name] = {
      class: BoosterDataMigrationEntity,
      methodName: 'started',
    }

    this.config.events[BoosterDataMigrationFinished.name] = {
      class: BoosterDataMigrationFinished,
    }

    this.config.reducers[BoosterDataMigrationFinished.name] = {
      class: BoosterDataMigrationEntity,
      methodName: 'finished',
    }

    this.config.entities[BoosterDataMigrationEntity.name] = {
      class: BoosterDataMigrationEntity,
      eventStreamAuthorizer: BoosterAuthorizer.denyAccess,
    }
  }

  /**
   * TODO: We're loading tokenVerifier options from environment variables here for backwards
   * compatibility reasons, but the preferred way to initialize the project token verifiers
   * is by setting an implementation of the `TokenVerifier` interface in the project's config.
   * The Authentication Booster Rocket for AWS uses this initialization mechanism.
   *
   * @deprecated Please set your own implementation of the `TokenVerifier` interface in the project config.
   */
  private static loadTokenVerifierFromEnv(): void {
    const BOOSTER_JWT_ISSUER = process.env[JWT_ENV_VARS.BOOSTER_JWT_ISSUER]
    const BOOSTER_JWKS_URI = process.env[JWT_ENV_VARS.BOOSTER_JWKS_URI]
    const BOOSTER_ROLES_CLAIM = process.env[JWT_ENV_VARS.BOOSTER_ROLES_CLAIM]
    if (BOOSTER_JWT_ISSUER && BOOSTER_JWKS_URI && BOOSTER_ROLES_CLAIM) {
      console.warn(
        'Deprecation notice: Implicitly loading the JWT token verifier options from default environment variables is deprecated.' +
          " Please set your application's `config.tokenVerifiers` options explicitly in your `src/config/config.ts` file."
      )
      this.config.tokenVerifiers.push(
        new JwksUriTokenVerifier(BOOSTER_JWT_ISSUER, BOOSTER_JWKS_URI, BOOSTER_ROLES_CLAIM)
      )
    }
  }
}

function checkAndGetCurrentEnv(): string {
  const env = process.env.BOOSTER_ENV
  if (!env || env.trim().length == 0) {
    throw new Error(
      'Booster environment is missing. You need to provide an environment to configure your Booster project'
    )
  }
  return env
}

export async function boosterEventDispatcher(rawEvent: unknown): Promise<unknown> {
  return Booster.dispatchEvent(rawEvent)
}

export async function boosterServeGraphQL(rawRequest: unknown): Promise<unknown> {
  return Booster.serveGraphQL(rawRequest)
}

export async function boosterTriggerScheduledCommand(rawRequest: unknown): Promise<unknown> {
  return Booster.triggerScheduledCommand(rawRequest)
}

export async function boosterNotifySubscribers(rawRequest: unknown): Promise<unknown> {
  return Booster.notifySubscribers(rawRequest)
}

export async function boosterRocketDispatcher(rawRequest: unknown): Promise<unknown> {
  return Booster.dispatchRocket(rawRequest)
}
