/* eslint-disable @typescript-eslint/no-explicit-any */
import { BoosterConfig, EventEnvelope, Logger, UserApp, UUID } from '@boostercloud/framework-types'
import { expect } from 'chai'
import { date, random } from 'faker'
import { describe } from 'mocha'
import { Collection } from 'mongodb'
import { createStubInstance, fake, restore, SinonStub, SinonStubbedInstance, stub } from 'sinon'

import * as db from '../../src/services/db'
import {
  rawEventsToEnvelopes,
  readEntityEventsSince,
  readEntityLatestSnapshot,
  storeEvents,
} from '../../src/library/events-adapter'
import { createMockEventEnvelop, createMockSnapshot } from '../helpers/event-helper'

describe('events-adapter', () => {
  let mockConfig: BoosterConfig
  let mockLogger: Logger
  let mockEventEnvelop: EventEnvelope
  let mockSnapshot: EventEnvelope

  let loggerDebugStub: SinonStub
  let storeStub: SinonStub
  let queryStub: SinonStub
  let queryLatestStub: SinonStub
  let boosterEventDispatcherStub: SinonStub

  let mockUserApp: UserApp
  let collectionStub: Collection & SinonStubbedInstance<Collection>

  beforeEach(() => {
    mockConfig = new BoosterConfig('test')
    mockConfig.appName = 'nuke-button'

    mockEventEnvelop = createMockEventEnvelop()
    mockSnapshot = createMockSnapshot()

    loggerDebugStub = stub()
    storeStub = stub()
    boosterEventDispatcherStub = stub()
    queryStub = stub()
    queryLatestStub = stub()

    mockLogger = {
      info: fake(),
      error: fake(),
      debug: loggerDebugStub,
    }
    mockUserApp = {
      boosterEventDispatcher: boosterEventDispatcherStub,
    } as any

    collectionStub = createStubInstance(Collection) as any
    stub(db, 'getCollection').resolves(collectionStub)
  })

  afterEach(() => {
    restore()
  })

  describe('rawEventsToEnvelopes', () => {
    it('should return an empty array of envelopes', async () => {
      const results = rawEventsToEnvelopes([])
      const expected: EventEnvelope[] = []
      expect(results).to.deep.equal(expected)
    })

    it('should return an array of envelopes', async () => {
      const value1: EventEnvelope = createMockEventEnvelop()
      const value2: EventEnvelope = createMockEventEnvelop()
      const rawEvents: unknown[] = [value1 as unknown, value2 as unknown]
      const results = rawEventsToEnvelopes(rawEvents)
      const expected: EventEnvelope[] = [value1, value2]
      expect(results).to.deep.equal(expected)
    })
  })

  describe('readEntityEventsSince', () => {
    let mockEntityTypeName: string
    let mockEntityID: UUID

    beforeEach(() => {
      queryStub.resolves([mockEventEnvelop])

      mockEntityTypeName = random.alphaNumeric(10)
      mockEntityID = random.uuid()
    })

    it('should return expected result', async () => {
      const result = await readEntityEventsSince(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)
      const expectedLogMessage = `[EventsAdapter#readEntityEventsSince] Loaded events for entity ${mockEntityTypeName} with ID ${mockEntityID} with result:`

      expect(result).to.be.deep.equal([mockEventEnvelop])
      expect(mockLogger.debug).to.be.calledWith(expectedLogMessage, [mockEventEnvelop])
    })

    context('date provided', () => {
      let dateStr: string

      beforeEach(async () => {
        dateStr = date.recent().toISOString()

        await readEntityEventsSince(mockConfig, mockLogger, mockEntityTypeName, mockEntityID, dateStr)
      })

      it('should call event registry query with expected input', async () => {
        expect(queryStub).to.have.been.calledOnceWithExactly({
          createdAt: {
            $gt: dateStr,
          },
          kind: 'event',
          entityID: mockEntityID,
          entityTypeName: mockEntityTypeName,
        })
      })

      it('should call logger with message', async () => {
        const expectedLogMessage = `[EventsAdapter#readEntityEventsSince] Loaded events for entity ${mockEntityTypeName} with ID ${mockEntityID} with result:`
        expect(mockLogger.debug).to.be.calledWith(expectedLogMessage, [mockEventEnvelop])
      })
    })

    context('date not provided', () => {
      beforeEach(async () => {
        await readEntityEventsSince(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)
      })

      it('should call event registry query with expected input', () => {
        expect(queryStub).to.have.been.calledOnceWithExactly({
          createdAt: {
            $gt: new Date(0).toISOString(),
          },
          kind: 'event',
          entityID: mockEntityID,
          entityTypeName: mockEntityTypeName,
        })
      })

      it('should call logger with message', async () => {
        const expectedLogMessage = `[EventsAdapter#readEntityEventsSince] Loaded events for entity ${mockEntityTypeName} with ID ${mockEntityID} with result:`
        expect(mockLogger.debug).to.be.calledWith(expectedLogMessage, [mockEventEnvelop])
      })
    })
  })

  describe('readEntityLatestSnapshot', () => {
    let mockEntityTypeName: string
    let mockEntityID: UUID

    beforeEach(() => {
      queryLatestStub.resolves(mockSnapshot)

      mockEntityTypeName = random.alphaNumeric(10)
      mockEntityID = random.uuid()
    })

    it('should call event registry queryLatest', async () => {
      await readEntityLatestSnapshot(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)

      expect(queryLatestStub).to.have.been.calledOnceWithExactly({
        entityID: mockEntityID,
        entityTypeName: mockEntityTypeName,
        kind: 'snapshot',
      })
    })

    context('with snapshot', () => {
      beforeEach(() => {
        queryLatestStub.resolves(mockSnapshot)
      })

      it('should log expected message', async () => {
        await readEntityLatestSnapshot(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)

        expect(loggerDebugStub).to.have.been.calledOnceWithExactly(
          `[EventsAdapter#readEntityLatestSnapshot] Snapshot found for entity ${mockEntityTypeName} with ID ${mockEntityID}:`,
          mockSnapshot
        )
      })

      it('should return expected result', async () => {
        const result = await readEntityLatestSnapshot(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)

        expect(result).to.be.deep.equal(mockSnapshot)
      })
    })

    context('without snapshot', () => {
      beforeEach(async () => {
        queryLatestStub.resolves(null)
      })

      it('should log expected message', async () => {
        await readEntityLatestSnapshot(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)

        expect(loggerDebugStub).to.have.been.calledOnceWithExactly(
          `[EventsAdapter#readEntityLatestSnapshot] No snapshot found for entity ${mockEntityTypeName} with ID ${mockEntityID}.`
        )
      })

      it('should return null', async () => {
        const result = await readEntityLatestSnapshot(mockConfig, mockLogger, mockEntityTypeName, mockEntityID)

        expect(result).to.be.deep.equal(null)
      })
    })
  })

  describe('storeEvents', () => {
    context('no event envelopes', () => {
      beforeEach(async () => {
        await storeEvents(mockUserApp, [], mockConfig, mockLogger)
      })

      it('should not call event registry store', () => {
        expect(storeStub).not.to.have.been.called
      })

      it('should call userApp boosterEventDispatcher', () => {
        expect(boosterEventDispatcherStub).to.have.been.calledOnceWithExactly([])
      })
    })

    context('with event envelopes', () => {
      let mockEventEnvelop: EventEnvelope

      beforeEach(async () => {
        mockEventEnvelop = createMockEventEnvelop()

        await storeEvents(mockUserApp, [mockEventEnvelop], mockConfig, mockLogger)
      })

      it('should call event registry store', () => {
        expect(storeStub).to.have.been.calledWithExactly(mockEventEnvelop)
      })

      it('should call userApp boosterEventDispatcher', () => {
        expect(boosterEventDispatcherStub).to.have.been.calledOnceWithExactly([mockEventEnvelop])
      })
    })
  })
})
