import { Booster } from '../booster'
import { Class, ReadModelInterface } from '@boostercloud/framework-types'
import { getFunctionArguments } from './metadata'

export function sequencedBy(klass: Class<ReadModelInterface>, _functionName: string, parameterIndex: number): void {
  const args = getFunctionArguments(klass)
  const propertyName = args[parameterIndex]
  Booster.configureCurrentEnv((config): void => {
    if (!config.readModelSequenceKeys[klass.name]) config.readModelSequenceKeys[klass.name] = new Set<string>()
    config.readModelSequenceKeys[klass.name].add(propertyName)
  })
}
