import { Downloader } from './Downloader'
import { LogStats } from './Stats'
import { LogManager } from './LogManager';

class App {
  constructor() {
    this.option()
  }

  /**
   * This function handle the different option possible for the mute-logs-retriever
   */
  private option(): void {
    const options = process.argv.slice(2)
    if (options.length > 0) {
      const opt = options.shift()
      switch (opt) {
        case 'download':
          this.download(options)
          break
        case 'stats':
          this.stats(options)
          break
        case 'hello':
          this.hello()
          break
        default:
          console.log('[MLR] Error : Option ' + opt + ' does not exist')
          this.usage()
          break
      }
    } else {
      console.log('[MLR] Error argument is missing')
      this.usage()
    }
  }

  private usage() {
    console.log('Usage : ')
    console.log('npm start -- option')
    console.log('option : ')
    console.log('\tdownload - Retrieve data from a mongo database')
    console.log('\thello    - Say hello to the world !')
  }

  private download(optLeft: string[]): void {
    const download = new Downloader(optLeft)
    download.displayOptions()
    download.start().then(() => {
      download.downloadCollection().then(() => {
        download.stop()
      })
    })
  }

  private stats(optLeft: string[]) {
    const stats = new LogStats(optLeft)
    stats.loadFile().then(() => {
      stats.computeStats()
      console.log('Fin')
    }).catch(err=>{
      LogManager.error(err)
      console.log(err)
    })
  }

  private hello(): void {
    LogManager.log('Hello World !')
  }
}

const app = new App()
