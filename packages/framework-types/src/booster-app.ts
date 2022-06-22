import {
  BoosterConfig,
  UUID,
  EntityInterface,
  Class,
  ReadModelInterface,
  Searcher,
  EventSearchParameters,
  EventSearchResponse,
  EventDeleteParameters,
  PaginatedEntitiesIdsResult,
  Instance,
} from '.'

/**
 * `BoosterApp` is the interface of the user-facing functions that
 * the framework provides.
 */
export interface BoosterApp {
  start(projectPath: string): void
  config: BoosterConfig
  configure(environment: string, configurator: (config: BoosterConfig) => void): void
  configureCurrentEnv(configurator: (config: BoosterConfig) => void): void
  entity<TEntity extends EntityInterface>(entityName: Class<TEntity>, entityID: UUID): Promise<TEntity | undefined>
  readModel<TReadModel extends ReadModelInterface>(readModelClass: Class<TReadModel>): Searcher<TReadModel>
  events(request: EventSearchParameters): Promise<Array<EventSearchResponse>>
  migrateEntity(oldEntityName: string, oldEntityId: UUID, newEntity: Instance & EntityInterface): Promise<void>
  entitiesIDs(
    entityTypeName: string,
    limit: number,
    afterCursor: Record<string, string> | undefined
  ): Promise<PaginatedEntitiesIdsResult>
  configuredEnvironments: Set<string>
  deleteEntity<TEntity extends EntityInterface>(entityClass: Class<TEntity>, entityID: UUID): Promise<void>
  deleteEvents(request: EventDeleteParameters): Promise<void>
  deleteReadModel<TReadModel extends ReadModelInterface>(readModelClass: Class<TReadModel>, id: UUID): Promise<void>
  replay<TEntity extends EntityInterface>(entityClass: Class<TEntity>, entityID: UUID): Promise<void>
}
