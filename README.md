# Mute Logs Retriever

This tool is used to retrieve logs from a collaborative session stored in the log collector

## Installation

Before starting, you have to install npm depedency and build the application.

```bash
npm install
npm run build
```

## Usage

Here are the differents commands of the mute-logs-retriever :

```bash
npm start -- command options
command :
    download - Retrieve data from a mongo database
    hello    - Say hello to the world !
```

### Download

```bash
npm start -- download [-m mongoUrl] [-d database] [-c collection] [-o output]
options :
    -c, --collection : Define the target collection - undefined by default
    -d, --database   : Define the database - muteLogs by default
    -h, --help       : Display this
    -m, --mongo      : Define the mongodb url - localhost by default
    -o, --output     : Define the paht of the ouput file - ~/Downloads/ by default
```

The file downloaded will be named : _mutelogs-{collection}-{date}.json_

The download process will add a finalState log, which is the maximum state we should reach.
Then an health check is done in order to detect missings operations

## Possible feature

- we could write a file during the healthCheck with some statistic on the logs. (Number of site, maximum collaborator at the same time, number of localOperation, etc...)
