import { getPropertiesMetadata } from './../../decorators/metadata'
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLString,
} from 'graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { ClassType, TypeGroup, TypeMetadata } from '../../metadata-types'
import { DateScalar, isExternalType } from './common'
export class GraphQLTypeInformer {
  private graphQLTypesByName: { input: Record<string, GraphQLInputType>; output: Record<string, GraphQLOutputType> } = {
    input: {},
    output: {},
  }

  public generateGraphQLTypeForClass(type: ClassType, inputOutputType: 'input'): GraphQLInputType
  public generateGraphQLTypeForClass(type: ClassType, inputOutputType: 'output'): GraphQLOutputType
  public generateGraphQLTypeForClass(
    type: ClassType,
    inputOutputType: 'input' | 'output'
  ): GraphQLInputType | GraphQLOutputType
  public generateGraphQLTypeForClass(
    type: ClassType,
    inputOutputType: 'input' | 'output'
  ): GraphQLInputType | GraphQLOutputType {
    const name = type.name + (inputOutputType === 'input' ? 'Input' : '')
    if (!this.graphQLTypesByName[inputOutputType][name]) {
      const properties = getPropertiesMetadata(type)
      if (inputOutputType === 'input') {
        this.graphQLTypesByName['input'][name] = new GraphQLInputObjectType({
          name,
          fields: properties.reduce(
            (obj, prop) => ({ ...obj, [prop.name]: { type: this.getGraphQLTypeFor(prop.typeInfo, 'input') } }),
            {}
          ),
        })
      } else {
        this.graphQLTypesByName['output'][name] = new GraphQLObjectType({
          name,
          fields: properties.reduce(
            (obj, prop) => ({ ...obj, [prop.name]: { type: this.getGraphQLTypeFor(prop.typeInfo, 'output') } }),
            {}
          ),
        })
      }
    }
    return this.graphQLTypesByName[inputOutputType][name]
  }

  public getGraphQLTypeFor(typeMetadata: TypeMetadata, inputOutputType: 'input'): GraphQLInputType
  public getGraphQLTypeFor(typeMetadata: TypeMetadata, inputOutputType: 'output'): GraphQLOutputType
  public getGraphQLTypeFor(
    typeMetadata: TypeMetadata,
    inputOutputType: 'input' | 'output'
  ): GraphQLInputType | GraphQLOutputType {
    const graphQLType = this.getNullableGraphQLTypeFor(typeMetadata, inputOutputType)
    return typeMetadata.isNullable ? graphQLType : new GraphQLNonNull(graphQLType)
  }

  public getNullableGraphQLTypeFor(
    { name, typeName, typeGroup, ...typeMetadata }: TypeMetadata,
    inputOutputType: 'input' | 'output'
  ): GraphQLInputType | GraphQLOutputType {
    if (typeName === 'UUID') return GraphQLID
    if (typeName === 'Date') return DateScalar
    if (typeGroup === TypeGroup.String) return GraphQLString
    if (typeGroup === TypeGroup.Number) return GraphQLFloat
    if (typeGroup === TypeGroup.Boolean) return GraphQLBoolean
    if (typeGroup === TypeGroup.Enum)
      return new GraphQLEnumType({
        name,
        values: typeMetadata.parameters.reduce((obj, el) => ({ ...obj, [el.name]: {} }), {}),
      })
    if (typeGroup === TypeGroup.Array) {
      const param = typeMetadata.parameters[0]
      const graphQLPropType = this.getNullableGraphQLTypeFor(param, inputOutputType)
      return GraphQLList(new GraphQLNonNull(graphQLPropType))
    }
    if (!typeName) return GraphQLJSONObject
    if (this.graphQLTypesByName[inputOutputType][typeName]) {
      return this.graphQLTypesByName[inputOutputType][typeName]
    }
    if (typeGroup === TypeGroup.Class && typeMetadata.type && !isExternalType(typeMetadata)) {
      return this.generateGraphQLTypeForClass(typeMetadata.type, inputOutputType)
    }
    return GraphQLJSONObject
  }

  // public isGraphQLScalarType(graphQLType: GraphQLOutputType): boolean {
  //   return graphQLType instanceof GraphQLScalarType && graphQLType != GraphQLJSONObject
  // }

  // public getGraphQLInputTypeFor(typeMetadata: TypeMetadata): GraphQLInputType {
  //   return this.toInputType(this.getGraphQLTypeFor(typeMetadata))
  // }

  // public toInputType(graphQLType: GraphQLOutputType): GraphQLInputType {
  //   if (graphQLType instanceof GraphQLScalarType || graphQLType instanceof GraphQLEnumType) {
  //     return graphQLType
  //   }
  //   if (graphQLType instanceof GraphQLList) {
  //     return new GraphQLList(this.toInputType(graphQLType.ofType))
  //   }
  //   if (graphQLType instanceof GraphQLNonNull) {
  //     return new GraphQLNonNull(this.toInputType(graphQLType.ofType))
  //   }
  //   if (graphQLType instanceof GraphQLObjectType) {
  //     return new GraphQLInputObjectType({
  //       name: `${graphQLType.name}Input`,
  //       fields: () =>
  //         Object.entries(graphQLType.getFields()).reduce(
  //           (obj, [fieldName, value]) => ({ ...obj, [fieldName]: this.toInputType(value.type) }),
  //           {}
  //         ),
  //     })
  //   }
  //   throw new Error(
  //     `Types '${GraphQLEnumType.name}' and '${GraphQLInterfaceType}' are not allowed as input type, ` +
  //       `and '${graphQLType.name}' was found`
  //   )
  // }
}
