import { Booster } from '../booster'
import { Class, ReadModelInterface } from '@boostercloud/framework-types'
import { getFunctionArguments } from './metadata'

export function IndexedBy(klass: Class<ReadModelInterface>, _functionName: string, parameterIndex: number): void {
  const args = getFunctionArguments(klass)
  const propertyName = args[parameterIndex]
  Booster.configureCurrentEnv((config): void => {
    if (!config.readModelIndexKeys[klass.name]) config.readModelIndexKeys[klass.name] = new Set<string>()
    config.readModelIndexKeys[klass.name].add(propertyName)
  })
}
