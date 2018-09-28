import { writeFile } from 'fs'
import { Mongo } from './mongo'
import { isUndefined } from 'util'

class App {
  private mongo: Mongo

  constructor() {
    let mongoURL = 'mongodb://localhost'
    let collection = undefined
    let filePath = (process.env.HOME || process.env.USERPROFILE) + '/Downloads/'

    if (process.argv.length > 2) {
      let cpt = 2
      const params = process.argv
      while (cpt < params.length) {
        const param = params[cpt].split('=')
        switch (param[0]) {
          case 'collection':
            collection = param[1]
            console.log('[MLR] Collection :', collection)
            break
          case 'mongo':
            mongoURL = 'mongodb://' + param[1]
            console.log('[MLR] mongodb :', mongoURL)
            break
          case 'path':
            filePath = param[1]
            console.log('[MLR] Path :', filePath)
            break
          default:
            this.usage()
            process.exit()
            break
        }
        cpt++
      }
      console.log()
    } else {
      this.usage()
      process.exit()
    }

    if (isUndefined(collection)) {
      console.error('[MLR] ERROR - You must precise the collection you want to retrieve logs')
      this.usage()
      process.exit()
    }

    this.mongo = new Mongo(mongoURL)
    this.mongo.start()

    this.mongo.connection$.subscribe(() => {
      this.downloadCollection(collection, filePath).then(() => {
        this.mongo.stop()
      })
      // process.exit()
    })
  }

  usage() {
    console.log('Usage : ')
    console.log('npm start -- collection [mongo] [path]')
    console.log('example : npm start -- collection=macollection path=~/ mongo=192.168.0.2')
  }

  async downloadCollection(collection: string, filePath: string): Promise<void> {
    const logs = await this.mongo.getAll(collection)
    let logString = logs
      .map((e) => {
        delete e._id
        return JSON.stringify(e) + ',\n'
      })
      .reduce((a, b) => {
        return a + b
      }, '')
    logString = '[' + logString.slice(0, logString.length - 2) + ']'
    const now = new Date()
    const fileName = 'mutelogs-' + collection + '-' + now.getHours() + now.getMinutes() + now.getSeconds() + '.json'
    writeFile(filePath + fileName, logString, 'utf8', (err) => {
      if (err) {
        throw err
      }
    })
    console.log('[MDM] Download successful in ' + filePath + ' !')
  }
}

const app = new App()
