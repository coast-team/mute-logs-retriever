import { writeFile } from 'fs'
import { Mongo } from './mongo'
import { HealthCheckManager } from './HealthCheckManager'
import { LogManager } from './LogManager'

export class Downloader {
  private mongoURL: string
  private database: string
  private collection: string
  private output: string

  private debug: boolean

  private mongo: Mongo

  constructor(options: string[], debug: boolean = true) {
    this.mongoURL = 'mongodb://localhost'
    this.database = 'muteLogs'
    this.collection = 'undefined'
    this.output = (process.env.HOME || process.env.USERPROFILE) + '/Downloads/'

    this.debug = debug

    this.options(options)

    this.mongo = new Mongo(this.mongoURL)
  }

  private options(opt: string[]) {
    while (opt.length > 0) {
      const o = opt.shift()
      switch (o) {
        case '-c':
        case '--collection':
          this.collection = opt.shift()
          break
        case '-d':
        case '--database':
          this.database = opt.shift()
          break
        case '-h':
        case '--help':
          this.usage()
          process.exit(0)
          break
        case '-m':
        case '--mongo':
          this.mongoURL = 'mongodb://' + opt.shift()
          break
        case '-o':
        case '--output':
          this.output = opt.shift()
          break
        default:
          LogManager.error('download : this option, ' + o + ', does not exist')
          this.usage()
          break
      }
    }
  }

  private usage() {
    console.log('Usage : ')
    console.log('npm start -- download [-m mongoUrl] [-d database] [-c collection] [-o output]')
    console.log('options : ')
    console.log('\t-c, --collection : Define the target collection - undefined by default')
    console.log('\t-d, --database   : Define the database - muteLogs by default')
    console.log('\t-h, --help       : Display this')
    console.log('\t-m, --mongo      : Define the mongodb url - localhost by default')
    console.log('\t-o, --output     : Define the paht of the ouput file - ~/Downloads/ by default')
  }

  public displayOptions() {
    console.log('[MLR] download options : ')
    console.log('\tmongo : ' + this.mongoURL)
    console.log('\tdatabase : ' + this.database)
    console.log('\tcollection : ' + this.collection)
    console.log('\toutput : ' + this.output)
  }

  public async downloadCollection(): Promise<void> {
    const logs = await this.mongo.getAll(this.collection)
    const now = new Date()
    const time =
      now.getDate() +
      '-' +
      (now.getMonth() + 1) +
      '-' +
      now.getFullYear() +
      '-' +
      now.getHours() +
      '-' +
      now.getMinutes() +
      '-' +
      now.getSeconds()

    if (this.debug) {
      LogManager.log('Final state calculation...')
    }
    logs.push(this.findFinalState(logs))

    const healthManager = new HealthCheckManager(logs, true, this.output + '/healthCheck_' + this.collection + '_' + time + '.txt')
    if (this.debug) {
      LogManager.log('HealthCheck in progress...')
    }
    const result = healthManager.healthCheck()

    let logString = healthManager
      .removeDuplicate(logs, result.duplica, result.duplica.length !== 0)
      .map((e) => {
        delete e['_id']
        return JSON.stringify(e) + ',\n'
      })
      .reduce((a, b) => {
        return a + b
      }, '')
    logString = '[' + logString.slice(0, logString.length - 2) + ']'
    const fileName = 'mutelogs_' + this.collection + '_' + time + '.json'
    writeFile(this.output + fileName, logString, 'utf8', (err) => {
      if (err) {
        throw err
      }
    })
    if (this.debug) {
      LogManager.log('Download successful in ' + this.output + ' !')
    }
  }

  public findFinalState(logs: object[]): object {
    const state = {}
    logs.forEach((l) => {
      const context = l['context'] as Array<number>
      const local = l['type'] === 'localInsertion' || l['type'] === 'localDeletion'
      if (local) {
        const siteId = l['siteId']
        const vFinalState = state[siteId]
        if (typeof vFinalState === 'undefined' || vFinalState < l['clock']) {
          state[siteId] = l['clock']
        }
      } else if (typeof context !== 'undefined') {
        for (const k in context) {
          const vFinalState = state[k]
          const v = context[k]
          if (typeof vFinalState === 'undefined' || vFinalState < v) {
            state[k] = v
          }
        }
      }
    })
    if (this.debug) {
      LogManager.log('Calculation done')
    }
    return { type: 'finalState', state }
  }

  public async start() {
    await new Promise((resolve, reject) => {
      this.mongo.connection$.subscribe(() => {
        resolve()
      })
      this.mongo.start(this.database)
    })
  }

  public stop() {
    this.mongo.stop()
  }
}
