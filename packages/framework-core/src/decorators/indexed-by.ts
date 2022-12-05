import { Booster } from '../booster'
import { ReadModelInterface } from '@boostercloud/framework-types'

export function IndexedBy() {
  return (target: ReadModelInterface, propertyName: string): void => {
    const readModelName = target.constructor.name
    Booster.configureCurrentEnv((config) => {
      if (!config.readModelIndexKeys[readModelName]) config.readModelIndexKeys[readModelName] = new Set<string>()
      config.readModelIndexKeys[readModelName].add(propertyName)
    })
  }
}
