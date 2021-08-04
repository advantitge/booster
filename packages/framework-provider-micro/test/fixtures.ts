import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinonChai from 'sinon-chai'

export const mochaGlobalSetup = async () => {
    chai.use(sinonChai)
    chai.use(chaiAsPromised)
}
