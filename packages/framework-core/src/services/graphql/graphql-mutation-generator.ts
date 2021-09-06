import { ResolverBuilder, TargetTypesMap } from './common'
import { GraphQLTypeInformer } from './graphql-type-informer'
import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLNonNull } from 'graphql'
import { TypeGroup } from 'framework-core/src/metadata-types'

export class GraphQLMutationGenerator {
  public constructor(
    private readonly targetTypes: TargetTypesMap,
    private readonly typeInformer: GraphQLTypeInformer,
    private readonly mutationResolver: ResolverBuilder
  ) {}

  public generate(): GraphQLObjectType | undefined {
    const mutations = this.generateMutations()
    if (Object.keys(mutations).length === 0) {
      return undefined
    }
    return new GraphQLObjectType({
      name: 'Mutation',
      fields: mutations,
    })
  }

  private generateMutations(): GraphQLFieldConfigMap<any, any> {
    const mutations: GraphQLFieldConfigMap<any, any> = {}
    for (const name in this.targetTypes) {
      const type = this.targetTypes[name]
      mutations[name] = {
        type: this.typeInformer.getGraphQLTypeFor(
          // TODO: proper output type
          {
            name,
            type: type.returnClass || Boolean,
            typeGroup: type.returnClass ? TypeGroup.Other : TypeGroup.Boolean,
            parameters: [],
            isNullable: false,
          },
          'output'
        ),
        args: {
          input: {
            type: new GraphQLNonNull(this.typeInformer.generateGraphQLTypeForClass(type.class, 'input')),
          },
        },
        resolve: this.mutationResolver(type.class),
      }
    }
    return mutations
  }
}
