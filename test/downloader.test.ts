import test from 'ava'
import { loadavg } from 'os'
import { readFile, exists } from 'fs'
import { Downloader } from '../src/Downloader'

function load(file: string): Promise<object[]> {
  return new Promise((resolve, reject) => {
    readFile(file, (err, data) => {
      resolve(JSON.parse(data.toString()))
    })
  })
}

test.beforeEach((context) => {
  context.context['downloader'] = new Downloader([], false)
})

test('Good file', async (context) => {
  const logs = await load('test/doc1.json')
  logs.push(context.context['downloader'].findFinalState(logs))
  const result = context.context['downloader'].healthCheck(logs)

  context.deepEqual(result, [])
})

test('1 local is missing - first', async (context) => {
  const logs = await load('test/doc2-1.json')
  logs.push(context.context['downloader'].findFinalState(logs))
  const result = context.context['downloader'].healthCheck(logs)

  context.deepEqual(result, [{ site: -1767873492, clock: 0 }])
})

test('1 local is missing - middle', async (context) => {
  const logs = await load('test/doc2-2.json')
  logs.push(context.context['downloader'].findFinalState(logs))
  const result = context.context['downloader'].healthCheck(logs)

  context.deepEqual(result, [{ site: -1767873492, clock: 2 }])
})

test('1 local is missing - last', async (context) => {
  const logs = await load('test/doc2-3.json')
  logs.push(context.context['downloader'].findFinalState(logs))
  const result = context.context['downloader'].healthCheck(logs)

  context.deepEqual(result, [{ site: -1767873492, clock: 3 }])
})
