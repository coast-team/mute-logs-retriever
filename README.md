# Mute Logs Retriever

This tool is used to retrieve logs from a collaborative session stored in the log collector

## Installation

Before starting, you have to install npm depedency and build the application.

```
npm install
npm run build
```

## Usage

`npm start -- collection [filePath] [mongo]`

- collection - the name of the document we want to retrieve logs
- filePath - The directory where th efile will be written - _by default ~/Downloads/_
- mongo - the url of the mongo database - _by default localhost_

The file downloaded will be named : _mutelogs-{collection}-{date}.json_

## Feature incoming

- At the end of the file we will add a final state log, which is the state that all site normally reach at the end of the session
- A checkup of the log will be done. This will detect if there is something wrong, such as local operation missing.
  The generated file will be named _mutelogs-{collection}-{date}.error_
