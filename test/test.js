import assert from 'assert';
import express from 'express';

import {YandexKassaHelper} from "../dist";

describe("YandexKassaHelper", () => {
  const helper = new YandexKassaHelper({
    yandexKassaConfig: {
      shopId: 1234,
      password: 'trololo'
    }
  });
  let server;

  before(async () => {
    const app = express();
    let test2Counter = 0, test4Counter = 0;
    server = app.listen(4001);
    app.use(express.json());
    app.get('/test/1', (request, response) => {
      response.status(200).json({ id: "test-1" });
    });
    app.get('/test/2', (request, response) => {
      if (test2Counter !== 2) {
        test2Counter++;
        response.status(202).json({ retry_after: 500 });
      } else {
        response.status(200).json({ id: "test-2" });
      }
    });
    app.get('/test/3', (request, response) => {
      response.status(401).json({ type: "invalid_credentials" });
    });
    app.get('/test/4', (request, response) => {
      if (test4Counter !== 2) {
        test4Counter++;
        response.status(202).json({ retry_after: 500 });
      } else {
        response.status(500).json({ type: "internal_server_error" });
      }
    });
  });

  after((done) => {
    server.close(done);
  });

  describe("#sendRequest", () => {
    it("should return on immediate success", async () => {
      const response = await helper.sendRequest({
        url: 'http://127.0.0.1:4001/test/1',
        method: 'GET',
        responseType: 'json'
      });
      assert.deepEqual(response, { id: "test-1" })
    });
    it("should retry on 202 status", async () => {
      const response = await helper.sendRequest({
        url: 'http://127.0.0.1:4001/test/2',
        method: 'GET',
        responseType: 'json'
      });
      assert.deepEqual(response, { id: "test-2" })
    });
    it("should return error on error", async () => {
      try {
        const response = await helper.sendRequest({
          url: 'http://127.0.0.1:4001/test/3',
          method: 'GET',
          responseType: 'json'
        });
      } catch (error) {
        assert.deepEqual(error, { type: "invalid_credentials" })
      }
    });
    it("should return error after unsuccessful retry", async () => {
      try {
        const response = await helper.sendRequest({
          url: 'http://127.0.0.1:4001/test/4',
          method: 'GET',
          responseType: 'json'
        });
      } catch (error) {
        assert.deepEqual(error, { type: "internal_server_error" })
      }
    });
  });
});
