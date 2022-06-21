import {
  ReadModelBeforeFunction,
  CommandBeforeFunction,
  CommandInput,
  UserEnvelope,
  ReadModelRequestEnvelope,
  ReadModelInterface,
} from '@boostercloud/framework-types'

export const applyReadModelRequestBeforeFunctions = async (
  readModelRequestEnvelope: ReadModelRequestEnvelope<ReadModelInterface>,
  beforeHooks: Array<ReadModelBeforeFunction>,
  currentUser?: UserEnvelope
): Promise<ReadModelRequestEnvelope<ReadModelInterface>> => {
  let result = readModelRequestEnvelope
  for (const beforeHook of beforeHooks) {
    result = await beforeHook(result, currentUser)
  }
  return result
}

export const applyBeforeFunctions = async (
  commandInput: CommandInput,
  beforeHooks: Array<CommandBeforeFunction>,
  currentUser?: UserEnvelope
): Promise<CommandInput> => {
  let result = commandInput
  for (const beforeHook of beforeHooks) {
    result = await beforeHook(result, currentUser)
  }
  return result
}
