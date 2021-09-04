import {
  ReadModelBeforeFunction,
  CommandBeforeFunction,
  CommandInput,
  UserEnvelope,
  ReadModelRequestEnvelope,
  ReadModelInterface,
} from '@boostercloud/framework-types'

export const applyReadModelRequestBeforeFunctions = (
  readModelRequestEnvelope: ReadModelRequestEnvelope<ReadModelInterface>,
  beforeHooks: Array<ReadModelBeforeFunction>
): ReadModelRequestEnvelope<ReadModelInterface> => {
  return beforeHooks.reduce(
    (currentReadModelRequestEnvelope, beforeFunction) => beforeFunction(currentReadModelRequestEnvelope),
    readModelRequestEnvelope
  )
}

export const applyBeforeFunctions = async (
  commandInput: CommandInput,
  beforeHooks: Array<CommandBeforeFunction>,
  currentUser?: UserEnvelope
): Promise<CommandInput> => {
  return beforeHooks.reduce(async (currentInputPromise, before) => {
    const currentInput = await currentInputPromise
    return Promise.resolve(before(currentInput, currentUser))
  }, Promise.resolve(commandInput))
}
