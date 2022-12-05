import { Booster } from '../booster'
import { Class, ReadModelInterface } from '@boostercloud/framework-types'

export function IndexedBy() {
  return (target: Class<ReadModelInterface>, propertyName: string): void => {
    const readModelName = target.constructor.name
    Booster.configureCurrentEnv((config) => {
      if (!config.readModelIndexKeys[readModelName]) config.readModelIndexKeys[readModelName] = new Set<string>()
      config.readModelIndexKeys[readModelName].add(propertyName)
    })
  }
}
