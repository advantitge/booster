/* eslint-disable @typescript-eslint/no-explicit-any */
import { UUID } from '@boostercloud/framework-types'
import { expect } from 'chai'
import { random } from 'faker'
import { IncomingMessage } from 'http'
import * as micro from 'micro'
import { createRequest } from 'node-mocks-http'
import { replace, restore, SinonStub, stub } from 'sinon'

import { rawGraphQLRequestToEnvelope } from '../../src/library/graphql-adapter'

describe('Local provider graphql-adapter', () => {
  describe('rawGraphQLRequestToEnvelope', () => {
    let mockUuid: string
    let mockBody: any
    let mockRequest: IncomingMessage & { body: unknown }
    let mockUserToken: string

    let debugStub: SinonStub
    let generateStub: SinonStub

    let logger: any

    beforeEach(() => {
      mockUuid = random.uuid()
      mockUserToken = random.uuid()
      mockBody = {
        query: '',
        variables: {},
      }
      mockRequest = createRequest({
        method: 'POST',
        body: mockBody,
        headers: {
          authorization: mockUserToken,
        },
      })
      stub(micro, 'json').returns(mockBody)

      debugStub = stub()
      generateStub = stub().returns(mockUuid)

      logger = {
        debug: debugStub,
      }

      replace(UUID, 'generate', generateStub)
    })

    afterEach(() => {
      restore()
    })

    it('should call logger.debug', async () => {
      await rawGraphQLRequestToEnvelope(mockRequest, logger)

      expect(debugStub).to.have.been.calledOnceWith(
        'Received GraphQL request: \n- Headers: ',
        mockRequest.headers,
        '\n- Body: ',
        mockRequest.body
      )
    })

    it('should generate expected envelop', async () => {
      const result = await rawGraphQLRequestToEnvelope(mockRequest, logger)

      expect(result).to.be.deep.equal({
        requestID: mockUuid,
        eventType: 'MESSAGE',
        connectionID: undefined,
        token: mockUserToken,
        value: mockBody,
      })
    })
  })
})
