import test from 'ava'
import nock from 'nock'
import integreat from 'integreat'

import couchdb from '..'

// Helpers

const sources = [{
  id: 'store',
  adapter: 'couchdb',
  baseUri: 'http://test.api',
  endpoints: [
    { scope: 'member', options: { uri: '/{id}' } }
  ]
}]

const mappings = [{
  type: 'article',
  source: 'store'
}]

const datatypes = [{
  id: 'article',
  source: 'store',
  attributes: {
    title: 'string'
  }
}]

test.after.always((t) => {
  nock.restore()
})

const defs = { sources, datatypes, mappings }

// Tests

test('should retrieve from couchdb', async (t) => {
  nock('http://test.api')
    .get('/article1')
    .reply(200, { _id: 'article1', type: 'article' })
  const resources = couchdb(integreat.resources())
  const great = integreat(defs, resources)
  const action = { type: 'GET', payload: { id: 'article1', type: 'article' } }

  const ret = await great.dispatch(action)

  t.true(Array.isArray(ret.data))
  t.is(ret.data[0].id, 'article1')
})

test('should send to couchdb', async (t) => {
  const scope = nock('http://test.api')
    .put('/article2', (body) => body._id === 'article2')
    .reply(201, { _id: 'article2', _rev: '1-8371734' })
  const resources = couchdb(integreat.resources())
  const great = integreat(defs, resources)
  const action = { type: 'SET', payload: { data: { id: 'article2', type: 'article' } } }

  const ret = await great.dispatch(action)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should get rev before sending to couchdb', async (t) => {
  const scope = nock('http://test.api')
    .post('/_all_docs', { keys: ['article3'] })
    .reply(200, { rows: [{ id: 'article3', key: 'article3', value: { rev: '1-8371734' } }] })
    .put('/article3', (body) => body._rev === '1-8371734')
    .reply(201, { _id: 'article3', _rev: '2-3139483' })
  const resources = couchdb(integreat.resources())
  const great = integreat(defs, resources)
  const action = { type: 'SET', payload: { data: { id: 'article3', type: 'article' } } }

  const ret = await great.dispatch(action)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})
