import { createWriteStream } from 'fs'

export class LogManager {
  public static log(msg: string) {
    console.log('[MLR] - ' + msg)
  }

  public static error(msg: string) {
    console.log('[MLR] [ERROR] - ' + msg)
  }

  public static write(filePath: string, msg: string) {
    const stream = createWriteStream(filePath, { flags: 'a' })
    stream.write('[MLR] - ' + msg + '\n')
  }
}
