import request from 'supertest'
import { expect } from 'chai'
import fs from 'fs'
import path from 'path'

function loadAppWithEnv(env = {}) {
  // set env vars
  Object.assign(process.env, env)
  // clear module cache for server
  delete require.cache[require.resolve('../api/index.js')]
  return import('../api/index.js').then((m) => m.default)
}

describe('Multipart upload endpoint', function () {
  it('accepts file upload and returns created item', function (done) {
    loadAppWithEnv().then((app) => {
      const fixture = path.join(process.cwd(), 'test/fixtures/sample.txt')
      request(app)
        .post('/api/keywords/form')
        .field('title', 'Test Upload Cluster')
        .field('meta', JSON.stringify([{ title: 'Sample Doc', snippet: 'A test file' }]))
        .attach('files', fixture)
        .expect(201)
        .then((res) => {
          expect(res.body).to.have.property('id')
          expect(res.body).to.have.property('docs')
          expect(res.body.docs).to.be.an('array')
          expect(res.body.docs[0]).to.have.property('file')
          const fileUrl = res.body.docs[0].file
          // check file exists on disk
          const filename = fileUrl.replace('/uploads/', '')
          const uploadPath = path.join(process.cwd(), 'api', 'uploads', filename)
          expect(fs.existsSync(uploadPath)).to.equal(true)
          done()
        })
        .catch(done)
    }).catch(done)
  })

  it('rejects invalid mime types', function (done) {
    loadAppWithEnv().then((app) => {
      const fixture = path.join(process.cwd(), 'test/fixtures/sample.exe')
      request(app)
        .post('/api/keywords/form')
        .field('title', 'Bad Upload')
        .field('meta', JSON.stringify([{ title: 'Exe', snippet: 'Bad file' }]))
        .attach('files', fixture)
        .expect(500)
        .then(() => done())
        .catch(done)
    }).catch(done)
  })

  it('rejects oversized files', function (done) {
    // set very small MAX_FILE_BYTES to trigger rejection
    loadAppWithEnv({ MAX_FILE_BYTES: '10' }).then((app) => {
      const fixture = path.join(process.cwd(), 'test/fixtures/sample.txt')
      request(app)
        .post('/api/keywords/form')
        .field('title', 'Large Upload')
        .field('meta', JSON.stringify([{ title: 'Large', snippet: 'Too big' }]))
        .attach('files', fixture)
        .expect(500)
        .then(() => done())
        .catch(done)
    }).catch(done)
  })
})
